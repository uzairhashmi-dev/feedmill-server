import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const isLogin = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "Unauthorized - No access token",
        success: false,
        data: null
      });
    }

    const decoded = jwt.verify(accessToken, process.env.AT_SECRET);

    
    // Attach user data to request
    req.id = decoded.id;
    req.role = decoded.role;

next();

  } catch (error) {
    console.error("Auth middleware error:", error);
    
    // jwt.verify errors handle karo
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
        success: false,
        data: null
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
        data: null
      });
    }

    return res.status(401).json({
      message: "Unauthorized",
      success: false,
      data: null
    });
  }
};

export default isLogin;