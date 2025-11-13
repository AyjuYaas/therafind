import { JSX, useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { useUserStore } from "../../../store/useUserStore";
import { Preference, PreferenceForm } from "../../../types/user.types";
import languages from "../../TherapistAuthLayout/data/language.data";

interface Props {
  preference: Preference | null;
  toggleProblemBar: () => void;
}

const ProblemBar = ({ preference, toggleProblemBar }: Props): JSX.Element => {
  const [formData, setFormData] = useState<PreferenceForm>({
    preferredGender: preference?.preferredGender || "",
    preferredLanguage: preference?.preferredLanguage || "",
    problemText: preference?.problemText || "",
  });

  const { updateProblem, loading } = useUserStore();

  const handleFormData = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await updateProblem(formData);
    if (res) {
      toggleProblemBar();
    }
  };

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Element)) {
        toggleProblemBar();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toggleProblemBar]);

  const wordCount = formData.problemText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return (
    <div className="fixed z-100 top-0 bottom-0 left-0 right-0 h-screen w-full backdrop-blur-xs flex justify-center items-center">
      <div
        className="relative w-200 max-h-190 h-screen bg-cbg-two px-8 py-10 rounded-4xl overflow-auto"
        ref={menuRef}
      >
        <div className="flex flex-col text-xl md:text-5xl">
          <span>Enter</span>
          <span className="font-fancy tracking-wider">
            Your Problem & Preference
          </span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-5">
          <div className="flex flex-col mb-5">
            <label className="text-base md:text-xl mb-1 font-bold">
              Preferred Language
            </label>
            <select
              name="preferredLanguage"
              value={formData.preferredLanguage}
              onChange={handleFormData}
              className="bg-white rounded-xl p-2 md:p-3 text-base md:text-xl"
            >
              <option value="">Select a language</option>
              {languages.map((lang, index) => (
                <option key={index} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col mb-5">
            <label className="text-base md:text-xl mb-1 font-bold">
              Preferred Therapist Gender
            </label>
            <select
              name="preferredGender"
              value={formData.preferredGender}
              onChange={handleFormData}
              className="bg-white rounded-xl p-2 md:p-3 text-base md:text-xl"
            >
              <option value="">Select the preferred Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Others</option>
              <option value="Any">Any</option>
            </select>
          </div>

          <div className="flex flex-col mb-5">
            <label className="text-base md:text-xl mb-1 font-bold">
              Describe your Problem
            </label>
            <textarea
              id="problemText"
              name="problemText"
              rows={5}
              cols={5}
              value={formData.problemText}
              onChange={handleFormData}
              placeholder="Enter the problem you're experiencing in detail"
              className="bg-white rounded-xl p-3 md:p-5 text-base md:text-xl"
            ></textarea>
            <div>
              <span className="text-base">
                Describe your problem in detail,{" "}
                <span className="font-semibold text-highlight-two">
                  in more than 20 words
                </span>
                , for the therapist to properly understand and system to
                classify more accurately.
              </span>
            </div>
            <div className="mt-4 font-bold">
              <span>Words: {wordCount}</span>
            </div>
          </div>

          <button
            type="submit"
            className={`size-12 -mt-10 text-2xl self-end flex justify-center items-center rounded-full cursor-pointer ${
              loading
                ? "cursor-not-allowed bg-gray-500"
                : "bg-amber-400 hover:bg-amber-500"
            }`}
          >
            <IoSend />
          </button>
        </form>

        <button
          className="absolute top-10 right-6 bg-main-text text-white size-8 text-2xl flex justify-center items-center rounded-full cursor-pointer"
          onClick={toggleProblemBar}
        >
          <IoMdClose />
        </button>
      </div>
    </div>
  );
};

export default ProblemBar;
