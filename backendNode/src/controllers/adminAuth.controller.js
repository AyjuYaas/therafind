import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import validator from "email-validator";
import validatePassword from "../middleware/password.middle.js";
import Admin from "../models/admin.model.js";

// =========== Creates a token fot the user ===============
const signToken = (id) => {
  //jwt token
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ============== User Signup Function ==============
export const adminSignup = async (req, res) => {
  // ============= get these fields from the client ===========
  const { name, email, password } = req.body;

  try {
    // =========== Check if all the values are provided =============
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ============== Email Validation ============
    if (!validator.validate(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email Address",
      });
    }

    // =========== Password Validation ===========
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors.join(", "),
      });
    }

    // ============ If everything okay, create the user ===========
    const admin = await Admin.create({
      name,
      email,
      password,
    });

    // =========== Create a user token =============
    const token = signToken(admin._id);

    // ======= create a jwt token ===========
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
      httpOnly: true, //prevents any XSS attacks
      sameSite: "none", //prevents any CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    // ============= Send Success Message ===========
    res.status(201).json({
      success: true,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error(`Error in user signup controller: ${err}`);

    // Handle duplicate key errors
    if (err.name === "MongoServerError" && err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${
          field === "email" ? "Email" : "Phone number"
        } is already registered`,
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// ============== User Login Function ==============
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ========= Check for any missing value ============
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ============= Find the user using their email and grab the password ==========
    const admin = await Admin.findOne({ email }).select("+password");

    // ========== If no user exists ot password doesn't match throw error ===============
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // =========== Create a user token =============
    const token = signToken(admin._id);

    // ======= create a jwt token ===========
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
      httpOnly: true, //prevents any XSS attacks
      sameSite: "none", //prevents any CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      success: true,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.log(`Error in user login controller: ${err}`);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
