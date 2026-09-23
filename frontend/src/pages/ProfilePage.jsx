import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera } from "lucide-react";
import ImageLightbox from "../components/ImageLightbox";

const formatMemberSince = (createdAt) => {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt.split("T")[0];
  return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
};

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const avatarSrc = selectedImg || authUser.profilePic || "/avatar.png";

  return (
    <>
      <div className="min-h-[100dvh] bg-base-200/50 pt-14">
        <div className="mx-auto max-w-md px-4 py-8 sm:py-14">
          <div className="rounded-xl border border-base-content/10 bg-base-100 px-6 py-8 sm:px-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  aria-label="View profile photo"
                  title="View profile photo"
                  className="block rounded-full"
                >
                  <img
                    src={avatarSrc}
                    alt=""
                    className="size-28 rounded-full border border-base-content/10 object-cover transition-opacity hover:opacity-90"
                  />
                </button>
                <label
                  htmlFor="avatar-upload"
                  title="Change photo"
                  className={`absolute bottom-0.5 right-0.5 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-base-100 bg-primary text-primary-content transition-transform focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-base-100 motion-safe:hover:scale-105 ${
                    isUpdatingProfile ? "pointer-events-none motion-safe:animate-pulse" : ""
                  }`}
                >
                  <Camera className="size-4" aria-hidden="true" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="sr-only"
                    accept="image/*"
                    aria-label="Change profile photo"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>

              <h1 className="mt-5 text-xl font-semibold tracking-tight">{authUser?.fullName}</h1>
              <p className="mt-0.5 text-[15px] text-base-content/75">{authUser?.email}</p>
              <p className="mt-3 text-[13px] text-base-content/75">
                {isUpdatingProfile ? "Uploading…" : "Use the camera button to change your photo"}
              </p>
            </div>

            <dl className="mt-8 divide-y divide-base-content/10 border-t border-base-content/10 text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-base-content/75">Member since</dt>
                <dd className="font-medium">{formatMemberSince(authUser.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-base-content/75">Account status</dt>
                <dd className="flex items-center gap-2 font-medium">
                  <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                  Active
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Full size image modal */}
      <ImageLightbox
        isOpen={isModalOpen}
        src={avatarSrc}
        alt="Profile photo, full size"
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
export default ProfilePage;
