import userModel from "../models/userModel.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
dotenv.config({});

export const registerUser = async (req, res) => {
  try {
    const { fullname, username, email, password, phone, address, role } = req.body;

    const existingUserByname = await userModel.findOne({ username });
    if (existingUserByname) {
      return res.status(400).json({
        success: false,
        message: 'username already taken'
      });
    }
       const existingUserByEmail = await userModel.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // 5. Create new user
    const newUser = await userModel.create({
      fullname,
      username,
      email,
      password,
      phone,
      address,
      role: role || 'receptionist' 
    });



    // 7. Response send karna (without password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: newUser
    });

  } catch (error) {

    // Server error
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "username & Password are Required!" });
    }

    const user = await userModel.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User Not Found!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "password not match" });
    }

    const generateAccessToken = (user) => {
      const accessData = {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
      };

      return jwt.sign(accessData, process.env.AT_SECRET, {
        expiresIn: process.env.AT_EXPIRES_IN,
      });
    };
    const generateRefreshToken = (user) => {
      const refreshData = {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
      };

      return jwt.sign(refreshData, process.env.RT_SECRET, {
        expiresIn: process.env.RT_EXPIRES_IN,
      });
    };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

   res.cookie("accessToken", accessToken, {
  httpOnly: true,
  maxAge: process.env.AT_COOKIE_MAX_AGE,
  secure: true,        // none ke sath secure: true zaroori hai
  sameSite: "none",    // ← yeh change karo
});
    res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  maxAge: process.env.RT_COOKIE_MAX_AGE,
  secure: true,        // none ke sath secure: true zaroori hai
  sameSite: "none",
});

  
    // API Response (JSON format)
    res.status(200).json({
      message: "Login successful",
      success: true,
      data: {
        user: {
          id: user._id,
          fullname: user.fullname,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error",
      success: false,
      data: null,
    });
  }
};
export const refreshAccessToken = async (req, res) => {
  try {
    const  refreshToken  = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token not found",
        success: false,
        data: null,
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.RT_SECRET);
// Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      return res.status(401).json({
        message: "Refresh token expired login again",
        success: false,
        data: null
      });
    }

  const user= await userModel.findById(decoded.id);
   const generateNewAccessToken = (user) => {
      const accessData = {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
      };

      return jwt.sign(accessData, process.env.AT_SECRET, {
        expiresIn: process.env.AT_EXPIRES_IN,
      });
    };

    // Generate new access token
    const newAccessToken = generateNewAccessToken(user);
    

    // Set new access token cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      maxAge:process.env.AT_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.status(200).json({
      message: "Access token refreshed",
      success: true,
      data: {
      accessToken: newAccessToken,
      },
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({
      message: "Invalid or expired refresh token",
      success: false,
      data: null,
    });
  }
};
export const logout = async (_req, res) => {
  try {
    // Cookie clear karo
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // API Response
    res.status(200).json({
      message: "Logout successful",
      status: "success",
      data: null,
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({
      message: "internal server error",
      success: false,
      data: null,
    });
  }
};
