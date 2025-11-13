import Therapist from "../models/therapist.model.js";
import jwt from "jsonwebtoken";
import validator from "email-validator";
import validatePassword from "../middleware/password.middle.js";
import therapistRatingandMatch from "../utils/therapistRatingandMatch.js";

// Create a new token based on id
const signToken = (id) => {
  //return jwt token
  return jwt.sign({ id, role: "therapist" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const therapistSignup = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    gender,
    languages: language,
    specialization,
    experience,
    qualification,
  } = req.body;

  try {
    // =========== Check if all the values are provided =============
    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !gender ||
      !language ||
      !specialization ||
      !experience ||
      !qualification
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const nameRegex = /^[A-Za-z\s\-]{2,}$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be at least 2 characters long and contain only letters, spaces, or hyphens",
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

    // ============== Check if the phone-number is 10 digits ============
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number should be 10 digits",
      });
    }

    if (experience < 0 || experience > 50) {
      return res.status(400).json({
        success: false,
        message: "Experience should be between 0 and 50 years",
      });
    }

    // =========== If everything is okay, create the new Therapist
    const therapist = await Therapist.create({
      name,
      email,
      password,
      phone,
      gender,
      language,
      specialization,
      experience,
      qualification,
    });

    // ========= Create a therapist token ============
    const token = signToken(therapist._id);

    // ========= Create a jwt token ===========
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
      httpOnly: true, //prevents any XSS attacks
      sameSite: "none", //prevents any CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    // ============= Send Success Message ===========
    res.status(201).json({
      success: true,
      therapist: {
        _id: therapist._id,
        name: therapist.name,
        image: therapist.image,
        rating: 0,
        reviewCount: 0,
        validationStatus: therapist.validationStatus,
      },
    });
  } catch (err) {
    console.log(`Error in therapist signup controller: ${err}`);
    if (err.name === "MongoServerError" && err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${
          field === "email" ? "Email" : "Phone number"
        } is already registered`,
      });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const therapistLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Find the therapist from the db
    const therapist = await Therapist.findOne({ email }).select("+password");

    // === if no therapist is found return error ======
    if (!therapist || !(await therapist.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ======= Create a user token =========
    const token = signToken(therapist._id);

    // ======== create a jwt token ==========
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
      httpOnly: true, //prevents any XSS attacks
      sameSte: "none", //prevents any CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    const stats = await therapistRatingandMatch(therapist._id);

    res.status(200).json({
      success: true,
      therapist: {
        _id: therapist._id,
        name: therapist.name,
        image: therapist.image,
        rating: stats.rating,
        reviewCount: stats.reviewCount,
        validationStatus: therapist.validationStatus,
      },
    });
  } catch (err) {
    console.log(`Error in therapist login controller: ${err}`);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
