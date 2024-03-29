const express = require("express");
const app = express();
const port = 3000;
const sql = require("mssql");
const bodyParser = require("body-parser");
const md5 = require("md5");
const cors = require("cors");
const { response } = require("express");
const crypto = require("crypto");
const { Console } = require("console");
const nodemailer = require("nodemailer");

const connStr =
  "Server=0.0.0.0,1449;Database=AV_DESEMP;User Id=admin;Password=123456;trustServerCertificate=true";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "xxxx@xxxxxxx.com.br",
    pass: "123456",
  },
});

let sessao = () => {
  let token = crypto.randomBytes(64).toString("hex");
  return token;
};

let criar_sessao = (codfunc, token) => {
  sql.connect(connStr).then((conn) => {
    let request = new sql.Request();

    console.log("conectou!");
    request.query(
      `INSERT INTO SESSAO VALUES ('${token}', ${codfunc}, GETDATE())`,
      function (err, recordset) {
        console.log(recordset);
      }
    );
  });
};

let job_sessao = () => {
  sql.connect(connStr).then((conn) => {
    console.log("conectou!");

    let request = new sql.Request();
    request.query(
      `DELETE FROM SESSAO WHERE DATAINC < DATEADD(hour, -24, GETDATE())`,
      function (err, recordset) {
        let resposta = recordset.recordsets[0];
        console.log("JOB APAGADOR DE SESSAO: ", resposta);
      }
    );
  });
};

setInterval(() => job_sessao(), 3600000);

app.post("/login", (req, res) => {
  console.log(req.body);

  let email = req.body.email;
  let senha = md5(req.body.senha);

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODFUNC, TIPOID, CODGESTOR FROM FUNCIONARIO WHERE EMAILFUNC = '${email}' AND SENHA = '${senha}'`,
        function (err, recordset) {
          try {
            console.log(recordset.recordsets[0][0]);
            let resposta = recordset.recordsets[0][0];
            resposta.token = sessao();
            criar_sessao(resposta.CODFUNC, resposta.token);
            res.json(resposta);
          } catch {
            res.send(403);
          }
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});


app.post("/login_sso", (req, res) => {
  console.log(req.body);

  let email = req.body.email;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODFUNC, TIPOID, CODGESTOR FROM FUNCIONARIO WHERE EMAILFUNC = '${email}'`,
        function (err, recordset) {
          try {
            console.log(recordset.recordsets[0][0]);
            let resposta = recordset.recordsets[0][0];
            resposta.token = sessao();
            criar_sessao(resposta.CODFUNC, resposta.token);
            res.json(resposta);
          } catch {
            res.send(403);
          }
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/valida", (req, res) => {
  console.log(req.body);

  let token = req.body.token;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT * FROM SESSAO WHERE TOKEN = '${token}'`,
        function (err, recordset) {
          console.log(recordset);
          let resposta = recordset.recordsets[0][0];
          console.log(resposta);
          if (!resposta) {
            res.send(401);
          } else {
            res.json(resposta);
          }
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/formulario", (req, res) => {
  console.log(req.body);

  let codfunc = req.body.codfunc;
  let codref = req.body.codref;
  let tipo;

  if (codfunc == codref) {
    tipo = "WHERE TIPO = 0";
  } else {
    tipo = "WHERE TIPO IN (0,1)";
  }

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT PIL.CODPIL, NOMEPIL, CODCARA, NOMECARA, PIL.TIPO FROM CARACTERISTICA CARA
        INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL ${tipo} ORDER BY CODCARA`,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/edit_formulario", (req, res) => {
  console.log(req.body);

  let codpen = req.body.codpen;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT PIL.CODPIL, NOMEPIL, CARA.CODCARA, NOMECARA, PIL.TIPO,
        (SELECT RESPOSTA FROM AVAITEM 
        INNER JOIN AVAPEN PEN ON PEN.CODAVA = AVAITEM.CODAVA
        WHERE AVAITEM.CODCARA = CARA.CODCARA AND PEN.CODPEN = ${codpen}) AS RESPOSTA
        FROM CARACTERISTICA CARA
                INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
            ORDER BY CARA.CODCARA`,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/resposta", (req, res) => {
  console.log(req.body);

  let codpen = req.body.codpen;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT NOMEPIL, PIL.TIPO, NOMECARA, RESPOSTA  FROM AVAITEM ITE
        INNER JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITE.CODCARA
        INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
        INNER JOIN AVAPEN PEN ON PEN.CODAVA = ITE.CODAVA
        WHERE CODPEN = ${codpen} ORDER BY PIL.CODPIL`,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/resposta_calibrar", (req, res) => {
  console.log(req.body);

  let codfunc = req.body.codfunc;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODPEN, FUN.NOMEFUNC, GES.NOMEFUNC AS NOMEGES, CODREF, NOMEPIL, PIL.TIPO, NOMECARA, RESPOSTA,

        (SELECT RESPOSTA
        FROM AVAITEM ITEM
                INNER JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITEM.CODCARA
                INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                INNER JOIN AVAPEN PEN ON PEN.CODAVA = ITEM.CODAVA
                INNER JOIN FUNCIONARIO FUN ON FUN.CODFUNC = PEN.CODFUNC
                INNER JOIN FUNCIONARIO GES ON GES.CODFUNC = PEN.CODREF
                WHERE STATUS = 2 AND PEN.CODFUNC = FUN.CODFUNC AND
                CODREF IN(PEN.CODFUNC, FUN.CODGESTOR) AND PEN.
                CODFUNC = ${codfunc} AND CODREF = FUN.CODGESTOR AND ITEM.CODCARA = ITE.CODCARA) AS RESPOSTA_GES
        
        FROM AVAITEM ITE
                INNER JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITE.CODCARA
                INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                INNER JOIN AVAPEN PEN ON PEN.CODAVA = ITE.CODAVA
                INNER JOIN FUNCIONARIO FUN ON FUN.CODFUNC = PEN.CODFUNC
                INNER JOIN FUNCIONARIO GES ON GES.CODFUNC = FUN.CODGESTOR
                WHERE STATUS = 2 AND PEN.CODFUNC = FUN.CODFUNC AND
                CODREF IN(PEN.CODFUNC, FUN.CODGESTOR) AND PEN.
                CODFUNC = ${codfunc} AND CODREF = ${codfunc}
                ORDER BY CARA.CODCARA`,
        function (err, recordset) {
          console.log(recordset.recordsets[0]);
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/resposta_func", (req, res) => {
  console.log(req.body);

  let codfunc = req.body.codfunc;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODPEN, FUN.NOMEFUNC, GES.NOMEFUNC AS NOMEGES, CODREF, NOMEPIL, PIL.TIPO, NOMECARA, RESPOSTA AS RESPOSTA_GES,

        (SELECT RESPOSTA
        FROM AVAITEM ITEM
                INNER JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITEM.CODCARA
                INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                INNER JOIN AVAPEN PEN ON PEN.CODAVA = ITEM.CODAVA
                INNER JOIN FUNCIONARIO FUN ON FUN.CODFUNC = PEN.CODFUNC
                INNER JOIN FUNCIONARIO GES ON GES.CODFUNC = PEN.CODREF
                WHERE STATUS = 3 AND PEN.CODFUNC = FUN.CODFUNC AND
                CODREF IN(PEN.CODFUNC, FUN.CODGESTOR) AND PEN.
                CODFUNC = ${codfunc} AND CODREF = ${codfunc} AND ITEM.CODCARA = ITE.CODCARA) AS RESPOSTA
        
        FROM AVAITEM ITE
                INNER JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITE.CODCARA
                INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                INNER JOIN AVAPEN PEN ON PEN.CODAVA = ITE.CODAVA
                INNER JOIN FUNCIONARIO FUN ON FUN.CODFUNC = PEN.CODFUNC
                INNER JOIN FUNCIONARIO GES ON GES.CODFUNC = FUN.CODGESTOR
                WHERE STATUS = 3 AND PEN.CODFUNC = FUN.CODFUNC AND
                CODREF IN(PEN.CODFUNC, FUN.CODGESTOR) AND PEN.
                CODFUNC = ${codfunc} AND CODREF = FUN.CODGESTOR
                ORDER BY CARA.CODCARA

	`,
        function (err, recordset) {
          console.log(recordset.recordsets[0]);
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/resposta_media", (req, res) => {
  console.log(req.body);

  let codpen = req.body.codpen;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT 1 AS ID, NOMEPIL, SUM(CAST(RESPOSTA AS int)) AS SOMA
        FROM AVAITEM ITE
                LEFT JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITE.CODCARA
                LEFT JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                LEFT JOIN AVAPEN PEN ON PEN.CODAVA = ITE.CODAVA
                WHERE CODPEN = ${codpen} AND TIPO = 0
            GROUP BY NOMEPIL
        
        UNION
        
        SELECT 99 AS ID, 'Total' AS NOMEPIL, COUNT(RESPOSTA) AS SOMA
        FROM AVAITEM ITE
                LEFT JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITE.CODCARA
                LEFT JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                LEFT JOIN AVAPEN PEN ON PEN.CODAVA = ITE.CODAVA
                WHERE CODPEN = ${codpen} AND TIPO = 0
        
        UNION
        
        SELECT 100 AS ID, 'Pontuação Média' as NOMEPIL, CAST(SUM(CAST(RESPOSTA AS DECIMAL))/COUNT(RESPOSTA) AS DECIMAL(5,2)) AS SOMA
        FROM AVAITEM ITE
                LEFT JOIN CARACTERISTICA CARA ON CARA.CODCARA  = ITE.CODCARA
                LEFT JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL
                LEFT JOIN AVAPEN PEN ON PEN.CODAVA = ITE.CODAVA
                WHERE CODPEN = ${codpen} AND TIPO = 0`,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/func_aval", (req, res) => {
  console.log(req.body);

  let codpen = req.body.codpen;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODPEN, FUNC.NOMEFUNC, STATUS, FUNC1.NOMEFUNC AS AVALIADOR, CODAVA FROM AVAPEN PEN
        INNER JOIN FUNCIONARIO FUNC ON FUNC.CODFUNC = PEN.CODFUNC
        INNER JOIN FUNCIONARIO FUNC1 ON FUNC1.CODFUNC = PEN.CODREF
        WHERE 
        DATEPART(YEAR,DATAINS) = (SELECT MAX(DATEPART(YEAR,DATAINS)) FROM AVAPEN) AND
        DATEPART(MONTH,DATAINS) = (SELECT MAX(DATEPART(MONTH,DATAINS)) FROM AVAPEN) AND
        DATEPART(DAY,DATAINS) = (SELECT MAX(DATEPART(DAY,DATAINS)) FROM AVAPEN)
        AND PEN.CODFUNC <> PEN.CODREF
        `,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/novo_usu", (req, res) => {
  console.log(req.body);
  let dados = req.body;

  console.log(dados);

  res.json({ data: null });

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();

      if (dados.codfunc) {
        request.query(
          `${
            dados.Nome
              ? "UPDATE FUNCIONARIO SET NOMEFUNC = '" +
                dados.Nome +
                `' WHERE CODFUNC = ${dados.codfunc} `
              : ""
          }` +
            `${
              dados.Email
                ? "UPDATE FUNCIONARIO SET EMAILFUNC = '" +
                  dados.Email +
                  `' WHERE CODFUNC = ${dados.codfunc} `
                : ""
            }` +
            `${
              dados.Departamento
                ? `UPDATE FUNCIONARIO SET CODDEP = (SELECT CODDEP FROM DEPARTAMENTO WHERE NOMEDEP ='${dados.Departamento}') WHERE CODFUNC = ${dados.codfunc} `
                : ""
            }` +
            `${
              dados.Cargo
                ? `UPDATE FUNCIONARIO SET CODCAR = (SELECT CODCAR FROM CARGO WHERE NOMECAR = '${dados.Cargo}') WHERE CODFUNC = ${dados.codfunc} `
                : ""
            }` +
            `${
              dados.FUNCIONARIO
                ? `UPDATE FUNCIONARIO SET CODGESTOR = (SELECT CODFUNC FROM FUNCIONARIO WHERE NOMEFUNC = '${dados.FUNCIONARIO}') WHERE CODFUNC = ${dados.codfunc} `
                : ""
            }` +
            `${
              dados.TIPOFUNC
                ? `UPDATE FUNCIONARIO SET TIPOID = (SELECT TIPOID FROM TIPOFUNC WHERE DESCRICAO = '${dados.TIPOFUNC}') WHERE CODFUNC = ${dados.codfunc} `
                : ""
            }`,

          function (err, recordset) {
            // console.log(request.query);
            res.json(recordset.recordsets[0]);
          }
        );
      } else {
        request.query(
          `INSERT INTO FUNCIONARIO VALUES ('${dados.Nome}','${dados.Email}',(SELECT CODDEP FROM DEPARTAMENTO WHERE NOMEDEP ='${dados.Departamento}'),(SELECT CODCAR FROM CARGO WHERE NOMECAR = '${dados.Cargo}'),(SELECT CODFUNC FROM FUNCIONARIO WHERE NOMEFUNC = '${dados.FUNCIONARIO}'),'123123','S',(SELECT TIPOID FROM TIPOFUNC WHERE DESCRICAO = '${dados.TIPOFUNC}'))`,
          function (err, recordset) {
            console.log(recordset);
            console.log(err);
            res.json(recordset);
          }
        );
      }
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/usu", (req, res) => {
  console.log(req.body);

  let codpen = req.body.codpen;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT FUNC.CODFUNC, FUNC.NOMEFUNC, FUNC.EMAILFUNC, NOMEDEP, NOMECAR, FUNC1.NOMEFUNC AS NOMEGESTOR, DESCRICAO
        FROM FUNCIONARIO FUNC
        INNER JOIN DEPARTAMENTO DEP ON DEP.CODDEP = FUNC.CODDEP
        INNER JOIN CARGO CAR ON CAR.CODCAR = FUNC.CODCAR
        LEFT JOIN FUNCIONARIO FUNC1 ON FUNC1.CODFUNC = FUNC.CODGESTOR
        INNER JOIN TIPOFUNC FUN ON FUN.TIPOID = FUNC.TIPOID
        `,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/iniciar_aval", (req, res) => {
  console.log(req.body);
  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODFUNC, CODGESTOR FROM FUNCIONARIO`,
        function (err, recordset) {
          let resposta = recordset.recordsets[0];
          resposta.forEach((element) => {
            request.query(
              `INSERT INTO AVAPEN (CODFUNC, STATUS, CODREF) VALUES (${element.CODFUNC},0,${element.CODFUNC})
              INSERT INTO AVAPEN (CODFUNC, STATUS, CODREF) VALUES (${element.CODFUNC},0,${element.CODGESTOR})`
            );
          });
          res.send(200);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/troca_senha", (req, res) => {
  console.log(req.body);

  let dados = req.body;

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT SENHA FROM FUNCIONARIO WHERE SENHA = '${md5(
          dados.password
        )}' AND CODFUNC = ${dados.codfunc}`,
        function (err, recordset) {
          console.log(recordset);
          let resposta = recordset.rowsAffected[0];

          request.query(
            `UPDATE FUNCIONARIO SET SENHA = ${dados.new_password} WHERE CODFUNC = ${dados.codfunc}`
          );

          res.json({ data: resposta });
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/encerrar_aval", (req, res) => {
  console.log(req.body);
  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(`UPDATE AVAPEN SET STATUS = 3`, function (err, recordset) {
        res.send(200);
      });
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/pendentes", (req, res) => {
  console.log(req.body);
  let codfunc = req.body.codfunc;
  let tipoid = req.body.tipoid;

  let tipo = () => {
    return tipoid == 2 ? "CODFUNC" : "CODREF";
  };

  let union = () => {
    return tipoid == 2
      ? ``
      : `UNION

    SELECT CODPEN, FUNC.NOMEFUNC, FUNC1.NOMEFUNC AS GESTOR, CASE WHEN STATUS = 0 THEN 'PENDENTE' WHEN STATUS = 3 THEN 'PERIODO ENCERRADO' ELSE 'REALIZADO' END AS STATUS, FORMAT(DATAINS, 'd', 'pt-br') AS DATAINS, 
    FORMAT(CAB.DTINC, 'd', 'pt-br') AS DTINC, FUNC.TIPOID, PEN.CODREF, FUNC.CODFUNC, FUNC.CODGESTOR
    FROM AVAPEN PEN
    LEFT JOIN FUNCIONARIO FUNC ON FUNC.CODFUNC = PEN.CODFUNC
    LEFT JOIN FUNCIONARIO FUNC1 ON FUNC1.CODFUNC = PEN.CODREF
    LEFT JOIN AVACAB CAB ON CAB.CODAVA = PEN.CODAVA
    WHERE FUNC.CODGESTOR = ${codfunc}

    UNION

    SELECT CODPEN, FUNC.NOMEFUNC, FUNC1.NOMEFUNC AS GESTOR, CASE WHEN STATUS = 0 THEN 'PENDENTE' WHEN STATUS = 3 THEN 'PERIODO ENCERRADO' ELSE 'REALIZADO' END AS STATUS, FORMAT(DATAINS, 'd', 'pt-br') AS DATAINS, 
    FORMAT(CAB.DTINC, 'd', 'pt-br') AS DTINC, FUNC.TIPOID, PEN.CODREF, FUNC.CODFUNC, FUNC.CODGESTOR
    FROM AVAPEN PEN
    LEFT JOIN FUNCIONARIO FUNC ON FUNC.CODFUNC = PEN.CODFUNC
    LEFT JOIN FUNCIONARIO FUNC1 ON FUNC1.CODFUNC = PEN.CODREF
    LEFT JOIN AVACAB CAB ON CAB.CODAVA = PEN.CODAVA
    WHERE FUNC.CODFUNC = ${codfunc}
    `;
  };

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT CODPEN, FUNC.NOMEFUNC, FUNC1.NOMEFUNC AS GESTOR, CASE WHEN STATUS = 0 THEN 'PENDENTE' WHEN STATUS = 3 THEN 'PERIODO ENCERRADO' ELSE 'REALIZADO' END AS STATUS, FORMAT(DATAINS, 'd', 'pt-br') AS DATAINS, 
        FORMAT(CAB.DTINC, 'd', 'pt-br') AS DTINC, FUNC.TIPOID, PEN.CODREF, FUNC.CODFUNC, NULL AS CODGESTOR
        FROM AVAPEN PEN
        LEFT JOIN FUNCIONARIO FUNC ON FUNC.CODFUNC = PEN.CODFUNC
        LEFT JOIN FUNCIONARIO FUNC1 ON FUNC1.CODFUNC = PEN.CODREF
        LEFT JOIN AVACAB CAB ON CAB.CODAVA = PEN.CODAVA
        WHERE PEN.${tipo()} = ${codfunc}
        ${union()}
        `,
        function (err, recordset) {
          try {
            res.json(recordset.recordsets[0]);
          } catch (err) {
            console.log(err);
          }
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/send_mail", (req, res) => {
  console.log(req.body);

  sql.connect(connStr).then((conn) => {
    console.log("conectou!");

    let request = new sql.Request();

    request.query(
      `SELECT CODREF, CODFUNC FROM AVAPEN WHERE STATUS = 0 AND CODFUNC = 2 AND CODFUNC <> CODREF`,
      function (err, recordset) {
        let dados = recordset.recordsets[0];
        dados.forEach((element) => {
          request.query(
            `SELECT EMAILFUNC, (SELECT NOMEFUNC FROM FUNCIONARIO WHERE CODFUNC = ${element.CODFUNC}) AS NOME FROM FUNCIONARIO WHERE CODFUNC = ${element.CODREF} AND TIPOID = 1 `,
            function (err, recordset) {
              try {
                let email = recordset.recordset[0].EMAILFUNC;
                let nome = recordset.recordset[0].NOME;
                console.log(email, nome);

                let corpo = `Olá, a avaliação do liderado ${nome} ainda está PENDENTE. Entre no sistema de Avaliações de Desempenho para realizar a mesma.`;

                transporter.sendMail({
                  from: '"Avaliação de Desempenho - JL Health" <noreply@medsystems.com.br>',
                  to: email,
                  subject: "Avaliação de Desempenho Pendente",
                  html: corpo,
                });
              } catch {
                console.log("Erro!");
              }
            }
          );
        });
      }
    );
  });
});

app.post("/send_formulario", (req, res) => {
  console.log(req.body);

  let corpo = req.body.dados;
  let codfunc = req.body.codfunc;
  let codpen = req.body.codpen;

  //inserir

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();

      request.query(
        `INSERT INTO AVACAB (CODFUNC) VALUES (${codfunc})`,
        function (err, recordset) {
          console.log(recordset);

          //consultar código
          sql
            .connect(connStr)
            .then((conn) => {
              console.log("conectou!");

              let request = new sql.Request();

              request.query(
                `SELECT MAX(CODAVA) FROM AVACAB WHERE CODFUNC = ${codfunc}`,
                function (err, recordset) {
                  let codava = recordset.recordset[0][""];

                  for (const [key, value] of Object.entries(corpo)) {
                    console.log(`${key}: ${value}`);

                    sql
                      .connect(connStr)
                      .then((conn) => {
                        console.log("conectou!");

                        let request = new sql.Request();

                        request.query(
                          `INSERT INTO AVAITEM (CODAVA, CODCARA, RESPOSTA) VALUES (${codava}, ${key}, '${value}')
                          UPDATE AVAPEN SET CODAVA = ${codava}, STATUS = 1 WHERE CODPEN = ${codpen}
                          `,
                          function (err, recordset) {
                            console.log(recordset);
                          }
                        );
                      })
                      .catch((err) => console.log("erro! " + err));
                  }
                }
              );
            })
            .catch((err) => console.log("erro! " + err));
          res.send(200);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/update_formulario", (req, res) => {
  console.log(req.body);

  let corpo = req.body.dados;
  let codpen = req.body.codpen;

  //update

  for (const [key, value] of Object.entries(corpo)) {
    console.log(`${key}: ${value}`);

    sql
      .connect(connStr)
      .then((conn) => {
        console.log("conectou!");

        let request = new sql.Request();

        request.query(
          `
          UPDATE ITEM SET RESPOSTA = '${value}' FROM AVAITEM AS ITEM
          INNER JOIN AVAPEN PEN ON PEN.CODAVA = ITEM.CODAVA
          WHERE PEN.CODPEN = ${codpen} AND ITEM.CODCARA = ${key}
                          `,
          function (err, recordset) {
            console.log(recordset, err);
          }
        );
      })
      .catch((err) => console.log("erro! " + err));
  }
});

app.post("/campos", (req, res) => {
  console.log(req.body);

  let campo = req.body.campo;
  let where = "WHERE TIPOID = 1";

  let campos = "";

  if (campo == "Departamento") {
    campos = "NOMEDEP as label";
  }
  if (campo == "FUNCIONARIO") {
    campos = "NOMEFUNC as label";
    campo = campo + " " + where;
  }
  if (campo == "Cargo") {
    campos = "NOMECAR as label";
  }
  if (campo == "TIPOFUNC") {
    campos = "DESCRICAO as label";
  }
  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT ${campos} FROM ${campo}`,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`);
});
