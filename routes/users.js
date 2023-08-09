const router = require("express").Router();
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const db = require("../db");
const nodemailer = require("nodemailer");

//register
router.post("/register", (req, res) => {
  console.log(req.body);
  const firstname = req.body.firstName;
  const lastname = req.body.lastName;
  const companyName = req.body.companyName;
  const designation = req.body.designation;
  const phoneNumber = req.body.phoneNumber;
  const email = req.body.companyEmailID;

  db.query(
    "SELECT * FROM organizations WHERE name = ?",
    [companyName],
    (err, result) => {
      if (err) {
        console.log(err);
        res.send({ error: err.sqlMessage });
      } else {
        if (result[0]) {
          db.query(
            "INSERT INTO users (first_name, last_name, email, organization_id, phone_number, designation) VALUES (?,?,?,?,?,?)",
            [
              firstname,
              lastname,
              email,
              result[0].id,
              phoneNumber,
              designation,
            ],
            (err, result) => {
              if (err) {
                console.log(err);
                res.send({ error: err.sqlMessage });
              } else {
                var emailOTP = Math.floor(1000 + Math.random() * 9000);
                db.query(
                  "INSERT INTO one_time_passwords (user_id, email_otp) VALUES (?,?)",
                  [result.insertId, emailOTP],
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      res.send({ error: err.sqlMessage });
                    } else {
                      console.log(result);
                      res.send("new user has been created!");
                    }
                  }
                );
              }
            }
          );
        } else {
          db.query(
            "INSERT INTO organizations (name) VALUES (?)",
            [companyName],
            (err, result) => {
              if (err) {
                console.log(err);
                res.send({ error: err.sqlMessage });
              } else {
                db.query(
                  "INSERT INTO users (first_name, last_name, email, organization_id, phone_number, designation) VALUES (?,?,?,?,?,?)",
                  [
                    firstname,
                    lastname,
                    email,
                    result.insertId,
                    phoneNumber,
                    designation,
                  ],
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      res.send({ error: err.sqlMessage });
                    } else {
                      var emailOTP = Math.floor(1000 + Math.random() * 9000);
                      db.query(
                        "INSERT INTO one_time_passwords (user_id, email_otp) VALUES (?,?)",
                        [result.insertId, emailOTP],
                        (err, result) => {
                          if (err) {
                            console.log(err);
                            res.send({ error: err.sqlMessage });
                          } else {
                            console.log(result);
                            res.send("new user has been created!");
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }
    }
  );
});

//verify email and phone number
router.post("/verifyUser", (req, res) => {
  const email = req.body.companyEmailID;
  const emailOtp = req.body.emailOtp;
  const password = CryptoJS.AES.encrypt(req.body.password, "test").toString();

  db.query("SELECT id FROM users WHERE email = ?", [email], (err, result) => {
    if (err) {
      console.log(err);
      res.send({ error: err.sqlMessage });
    } else {
      console.log("result from user", result[0]);
      db.query(
        "SELECT email_otp FROM one_time_passwords WHERE user_id = ?",
        [result[0].id],
        (err, result) => {
          console.log("result from otp user", result[0]);
          if (err) {
            console.log(err);
            res.send({ error: err.sqlMessage });
          } else if (result[0].email_otp === emailOtp) {
            db.query(
              "UPDATE users SET password = ?, is_email_verified = '1' WHERE email = ?",
              [password, email],
              (err, result) => {
                if (err) {
                  console.log(err);
                  res.send({ error: err.sqlMessage });
                } else {
                  res.send("user has been verified!");
                  //delete otp from table?
                }
              }
            );
          } else {
            res.send("wrong otp");
          }
        }
      );
    }
  });
});

router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
      if (err) {
        console.log("error", err);
        res.send({ error: err.sqlMessage });
      } else {
        console.log("result", result);
        if (result.length == 0) {
          res.status(401).json("wrong email!");
        } else {
          const hashedPassword = CryptoJS.AES.decrypt(
            result[0].password,
            "test"
          );
          const originalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);
          if (originalPassword !== password) {
            res.status(401).json("wrong password!");
          } else {
            const accessToken = jwt.sign(
              {
                id: result[0].id,
              },
              "test",
              { expiresIn: "3d" }
            );
            // ye kya hai? others
            // const { password, ...others } = result[0];
            res.status(200).json({ message: "logged in", token: accessToken });
          }
        }
      }
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/forgotpassword", (req, res) => {
  try {
    const email = req.body.email;
    db.query(
      "SELECT * from users WHERE email = ?",
      [email],
      (error, results) => {
        if (error) {
          console.log("error", error);
          res.status(500).json({ message: error });
        } else {
          console.log("result from forgot", results);
          const token = jwt.sign(
            {
              userId: results[0].id,
            },
            "test",
            { expiresIn: "3d" }
          );
          console.log("token", token);
          // sendForgotEmail(email, token);
          res.status(200).json({ message: "email sent" });
        }
      }
    );
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: error });
  }
});

router.put("/updatepassword", (req, res) => {
  const token = req.header("x-auth-token");
  const decoded = jwt.verify(token, "test");
  const userId = decoded.userId;

  const { updatepassword } = req.body;
  try {
    if (!token) {
      res.send({ message: "token invalid" });
    } else {
      db.query(
        "UPDATE users SET password = ? where id = ?",
        [updatepassword, userId],
        (error, results) => {
          if (error) {
            console.log(error);
            res.status(500).json({ error: error.sqlMessage });
          } else {
            console.log("result", results);
            res.status(200).json({ message: "password updated" });
          }
        }
      );
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: error });
  }
});

function sendForgotEmail(email, token) {
  var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "rajpalessentials@gmail.com",
      pass: "pgizohotoxrricce",
    },
    port: "465",
    host: "smtp.gmail.com",
  });
  var mailOptions = {
    to: email,
    from: "rajpalessentials@gmail.com",
    subject: "Forgot Password",
    text: `To reset your password, visit http://localhost:3000/forgotpassword/${token}`,
  };
  smtpTransport.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

function sendOTP(otp, email) {
  var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "",
      pass: "",
    },
    port: "465",
    host: "smtp.gmail.com",
  });
  var mailOptions = {
    to: email,
    from: "",
    subject: "email verification",
    text: "Your OTP is\n\n" + otp + "\n\n",
  };
  smtpTransport.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

//sql ka as a function create karoge toh error ko send nahi kar paoge
function createUser(
  firstname,
  lastname,
  organizationId,
  email,
  phoneNumber,
  designation
) {
  var emailOTP = Math.floor(1000 + Math.random() * 9000);
  // sendOTP(emailOTP, email);
  db.query(
    "INSERT INTO users (first_name, last_name, email, organization_id, phone_number, designation) VALUES (?,?,?,?,?,?)",
    [firstname, lastname, email, organizationId, phoneNumber, designation],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        db.query(
          "INSERT INTO one_time_passwords (user_id, email_otp) VALUES (?,?)",
          [result.insertId, emailOTP],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              console.log(result);
            }
          }
        );
      }
    }
  );
}

module.exports = router;
