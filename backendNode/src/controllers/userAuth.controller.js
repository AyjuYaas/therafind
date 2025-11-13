import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import validator from "email-validator";
import validatePassword from "../middleware/password.middle.js";

// =========== Creates a token fot the user ===============
const signToken = (id) => {
  //jwt token
  return jwt.sign({ id, role: "user" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ============== User Signup Function ==============
export const userSignup = async (req, res) => {
  // ============= get these fields from the client ===========
  const { name, email, password, phone, birthDate, gender } = req.body;

  try {
    // =========== Check if all the values are provided =============
    if (!name || !email || !password || !phone || !birthDate || !gender) {
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

    // ============== Validate Date of Birth (DOB) =================
    const dob = new Date(birthDate); // Parse the birthDate string into a Date object
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear(); // Calculate age based on the year difference

    // Adjust age if the user hasn't had their birthday yet this year
    const hasHadBirthdayThisYear =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

    if (age < 10 || (age === 10 && !hasHadBirthdayThisYear)) {
      return res.status(400).json({
        success: false,
        message: "You must be at least 10 years old to sign up",
      });
    }

    // ============ If everything okay, create the user ===========
    const user = await User.create({
      name,
      email,
      password,
      phone,
      birthDate,
      gender,
    });

    // =========== Create a user token =============
    const token = signToken(user._id);

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
        _id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        image: user.image,
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
export const userLogin = async (req, res) => {
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
    const user = await User.findOne({ email }).select("+password");

    // ========== If no user exists ot password doesn't match throw error ===============
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // =========== Create a user token =============
    const token = signToken(user._id);

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
        _id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        image: user.image,
      },
    });
  } catch (err) {
    console.log(`Error in user login controller: ${err}`);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
