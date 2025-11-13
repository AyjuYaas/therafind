import { Rating } from "primereact/rating";
import { JSX, useEffect, useRef, useState } from "react";
import { RatingPassThroughOptions } from "primereact/rating";
import { useUserStore } from "../../../store/useUserStore";

const ratingPt: RatingPassThroughOptions = {
  onIcon: { className: "w-5 h-5" }, // Active star
  offIcon: { className: "w-5 h-5" }, // Inactive star
};

interface Props {
  toggleRemoveOption: () => void;
  id: string;
  name: string;
}

interface FormData {
  rating: number;
  reviewText: string;
}

const ReviewTherapist = ({
  toggleRemoveOption,
  id,
  name,
}: Props): JSX.Element => {
  const { existingReview, getExistingReview, resetExistingReview } =
    useUserStore();

  const [formData, setFormData] = useState<FormData>({
    rating: existingReview?.rating || 0,
    reviewText: existingReview?.reviewText || "",
  });

  useEffect(() => {
    getExistingReview(id);

    return () => {
      resetExistingReview();
    };
  }, [getExistingReview, id, resetExistingReview]);

  // Update formData when existingReview changes
  useEffect(() => {
    if (existingReview) {
      setFormData({
        rating: existingReview.rating,
        reviewText: existingReview.reviewText,
      });
    }

    return () => {
      setFormData({ rating: 0, reviewText: "" }); // Reset formData on unmount
    };
  }, [existingReview]);

  const { reviewTherapist, loadingReview } = useUserStore();

  const menuRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const handleCLickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Element)) {
        toggleRemoveOption();
      }
    };

    document.addEventListener("mousedown", handleCLickOutside);

    return () => {
      document.removeEventListener("mousedown", handleCLickOutside);
    };
  }, [toggleRemoveOption]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    reviewTherapist(id, formData.rating, formData.reviewText);
    toggleRemoveOption();
  };

  return (
    <div className="fixed z-100 top-0 bottom-0 left-0 right-0 h-screen w-full backdrop-blur-xs flex justify-center items-center self-center justify-self-center cursor-default">
      <form
        className="relative w-max md:w-150 h-auto bg-cbg-three rounded-xl shadow-2xl flex flex-col gap-4 py-7"
        ref={menuRef}
        onSubmit={handleSubmit}
      >
        <div className="text-2xl text-center mb-2 px-7 flex flex-col gap-4">
          <h1 className="font-bold text-main-text">Review {name}</h1>

          <div className="flex gap-2 items-center">
            <span className="text-xl font-bold text-highlight">Rating:</span>
            <Rating
              name="rating"
              value={formData.rating}
              onChange={(e) =>
                setFormData({ ...formData, rating: e.value || 0 })
              }
              cancel={false}
              pt={ratingPt}
            />
          </div>

          <div className="flex flex-col items-start w-full">
            <span className="text-xl font-bold text-highlight ml-1">
              Review
            </span>
            <textarea
              id="reviewText"
              name="reviewText"
              rows={2}
              cols={10}
              value={formData.reviewText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, reviewText: e.target.value })
              }
              placeholder={`How was your experience with ${name}?`}
              className="bg-white rounded-xl p-5 text-lg w-full"
            ></textarea>
          </div>

          <div className="flex items-start w-full ml-1 text-lg">
            <button
              className={`font-bold  p-2 px-5 text-white rounded-2xl shadow-2xl  ${
                loadingReview
                  ? "bg-zinc-500 cursor-not-allowed"
                  : "bg-[#545b74] cursor-pointer hover:bg-[#816d89]"
              }`}
              type="submit"
            >
              {loadingReview ? "Submitting.." : "Submit"}
            </button>

            <button
              className={`rounded-xl p-2 px-5 text-main-text hover:underline cursor-pointer hover:text-red-800 ${
                loadingReview && "cursor-not-allowed"
              }`}
              onClick={toggleRemoveOption}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default ReviewTherapist;
