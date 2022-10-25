const express = require("express");
const app = express();
const port = 3000;
const sql = require("mssql");
const bodyParser = require("body-parser");
const md5 = require("md5");
const cors = require("cors");
const { response } = require("express");

const connStr =
  "Server=10.10.10.5,1449;Database=AV_DESEMP;User Id=MEDSYSTEMS\\guilherme.floriano;Password=MickJa68@;trustServerCertificate=true";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

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
        `SELECT CODFUNC FROM FUNCIONARIO WHERE EMAILFUNC = '${email}' AND SENHA = '${senha}'`,
        function (err, recordset) {
          res.json(recordset.recordsets[0][0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/formulario", (req, res) => {
  console.log(req.body);

  sql
    .connect(connStr)
    .then((conn) => {
      console.log("conectou!");

      let request = new sql.Request();
      request.query(
        `SELECT PIL.CODPIL, NOMEPIL, CODCARA, NOMECARA FROM CARACTERISTICA CARA
        INNER JOIN PILAR PIL ON PIL.CODPIL = CARA.CODPIL WHERE TIPO = 0`,
        function (err, recordset) {
          res.json(recordset.recordsets[0]);
        }
      );
    })
    .catch((err) => console.log("erro! " + err));
});

app.post("/send_formulario", (req, res) => {
  console.log(req.body);

  let corpo = req.body.dados;
  let codfunc = req.body.codfunc;

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
                          `INSERT INTO AVAITEM (CODAVA, CODCARA, RESPOSTA) VALUES (${codava}, ${key}, ${value})`,
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

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`);
});
