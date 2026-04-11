import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();    

const alreadyLogin = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return next();
  }

  try {
    jwt.verify(token, process.env.AT_SECRET);
    return res.status(401).json({
      success: false,
      message: "You are already logged in",
      data: null
    });

  } catch (error) {
    return next();
  }
};

export default alreadyLogin;


