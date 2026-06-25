"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  ChevronDown,
  Info,
  PencilLine,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  apiGetBrandProfile,
  apiGetBrandWallet,
  apiUpdateBrandProfile,
  getApiErrorMessage,
} from "../../services/brandApi";
import { toast, ToastStyles } from "@/components/ui/toast";

type QA = {
  question: string;
  answers: string[];
};

type BrandSubscription = {
  planId?: string | null;
  planName?: string | null;
  name?: string | null;
  status?: string | null;
  billingCycle?: string | null;
  monthlyCost?: number | null;
  annualCost?: number | null;
  startedAt?: string | null;
  expiresAt?: string | null;
};

type BrandProfile = {
  _id?: string;
  brandId?: string;
  brandName?: string;
  name?: string;
  email?: string;
  proxyEmail?: string;
  profilePic?: string;
  companySize?: string;
  industry?: string;
  website?: string;
  phone?: string;
  contact?: string;
  mobile?: string;
  region?: string;
  country?: string;
  currency?: string;
  language?: string;
  contentLanguage?: string;
  timezone?: string;
  page1?: QA[];
  page2?: QA[];
  page3?: QA[];
  subscription?: BrandSubscription | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

type WalletData = {
  walletBalance: number;
  frozenBalance: number;
  usableBalance: number;
  freezes: Array<{
    brandId: string;
    campaignId: string;
    totalFrozenAmount: number;
    currentFrozenAmount: number;
    totalAllocatedAmount: number;
    totalReleasedAmount: number;
    availableToAllocate: number;
    influencerAllocations: Array<{
      influencerId: string;
      amount: number;
      releasedAmount: number;
    }>;
  }>;
};

type WalletApiPayload = Partial<WalletData> & {
  walletBalance?: number | null;
  frozenBalance?: number | null;
  usableBalance?: number | null;
};

type FormState = {
  profilePic: string;
  brandName: string;
  brandEmail: string;
  companySize: string;
  pocName: string;
  brandEmailAlias: string;
  industry: string;
  pocContact: string;
  website: string;
  companyDetails: string;
  brandType: string;
  role: string;
  platform: string;
  timezone: string;
  currency: string;
  region: string;
  language: string;
};

const PLATFORM_OPTIONS = ["Youtube", "Instagram", "Tiktok"] as const;
const TIMEZONE_OPTIONS = [
  "GMT+5:30 Indian standard time",
  "GMT+0:00 Greenwich mean time",
  "GMT-5:00 Eastern standard time",
  "GMT-8:00 Pacific standard time",
] as const;
const CURRENCY_OPTIONS = [
  "$ Dollars",
  "INR Rupees",
  "EUR Euros",
  "GBP Pounds",
] as const;
const DEFAULT_COUNTRY_OPTIONS = [
  "All",
  "India",
  "United States",
  "United Kingdom",
  "Europe",
] as const;
const DEFAULT_LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Spanish",
  "French",
] as const;

const pageClass = "min-h-screen bg-white font-sans text-[#202020] antialiased";
const frameClass =
  "mx-auto flex w-full max-w-[1170px] flex-col px-[56px] pb-[56px] pt-5";
const sectionLabelClass = "text-[15px] font-medium leading-5 text-[#9b9b9b]";
const fieldBaseClass =
  "h-[70px] w-full rounded-[12px] border border-[#dedede] bg-white px-3 pb-[10px] pt-[28px] text-[16px] font-medium leading-5 text-[#232323] outline-none transition placeholder:text-[#c7c7c7] focus:border-[#cfcfcf] focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed";
const fieldDisabledClass = "bg-[#f3f3f3] text-[#c3c3c3]";

type ListOptionKind = "country" | "language";

const LIST_API_BASE_URL = String(
  process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "",
).replace(/\/$/, "");

function buildListApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${LIST_API_BASE_URL}${path}`;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("brandToken") ||
    "";

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function unwrapListPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.docs,
    payload?.data?.items,
    payload?.data?.results,
    payload?.docs,
    payload?.items,
    payload?.results,
    payload?.list,
    payload?.countries,
    payload?.languages,
    payload?.contentLanguages,
  ];

  return candidates.find(Array.isArray) || [];
}

function getListOptionLabel(item: any, kind: ListOptionKind) {
  if (typeof item === "string") return item;

  const countryValues = [
    item?.name,
    item?.countryName,
    item?.country,
    item?.label,
    item?.value,
    item?.title,
    item?.code,
    item?.iso2,
  ];

  const languageValues = [
    item?.name,
    item?.languageName,
    item?.language,
    item?.label,
    item?.value,
    item?.title,
    item?.code,
  ];

  return String(
    (kind === "country" ? countryValues : languageValues).find(Boolean) || "",
  );
}

function normalizeListOptions(
  items: any[],
  kind: ListOptionKind,
  fallback: readonly string[],
) {
  const seen = new Set<string>();
  const options = items
    .map((item) => getListOptionLabel(item, kind).trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return options.length ? options : [...fallback];
}

async function fetchListOptions(
  path: string,
  kind: ListOptionKind,
  fallback: readonly string[],
) {
  const res = await fetch(buildListApiUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${kind} list`);
  }

  const payload = await res.json();
  return normalizeListOptions(unwrapListPayload(payload), kind, fallback);
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const [meta = "", base64 = ""] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:([^;]+);base64/i);
  const mime = mimeMatch?.[1] || "image/png";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mime });
}

function getUploadedPhotoDataUrl(payload: any) {
  return firstValue(
    payload?.dataUrl,
    payload?.data?.dataUrl,
    payload?.profilePic,
    payload?.data?.profilePic,
    payload?.profilePhoto,
    payload?.data?.profilePhoto,
    payload?.brandProfilePic,
    payload?.data?.brandProfilePic,
    payload?.url,
    payload?.data?.url,
    payload?.imageUrl,
    payload?.data?.imageUrl,
    payload?.secure_url,
    payload?.data?.secure_url,
  );
}

function getPayloadMessage(payload: any) {
  return String(
    payload?.message ||
      payload?.data?.message ||
      payload?.error ||
      payload?.data?.error ||
      "",
  );
}

async function apiUpdateBrandProfilePhoto(dataUrl: string) {
  const formData = new FormData();
  const file = dataUrlToFile(dataUrl, `brand-profile-${Date.now()}.png`);

  // Backend route: /brand/upload-brand-profile-pic
  // Send only the binary file. The API response returns the saved value in dataUrl.
  formData.append("brandProfilePic", file);

  const res = await fetch(buildListApiUrl("/brand/upload-brand-profile-pic"), {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: formData,
  });

  const payload = await res.json().catch(() => null);
  const message = getPayloadMessage(payload);
  const uploadedPhoto = getUploadedPhotoDataUrl(payload);

  if (!res.ok) {
    throw new Error(
      message ||
        getApiErrorMessage(
          payload,
          "Unable to upload brand profile photo.",
        ),
    );
  }

  if (!uploadedPhoto) {
    throw new Error("Profile image uploaded but dataUrl was not returned.");
  }

  return uploadedPhoto;
}

function normalizeWalletData(data: WalletApiPayload): WalletData {
  const walletBalance = Number(data?.walletBalance ?? 0);
  const frozenBalance = Number(data?.frozenBalance ?? 0);

  return {
    walletBalance,
    frozenBalance,
    usableBalance: Number(data?.usableBalance ?? walletBalance - frozenBalance),
    freezes: Array.isArray(data?.freezes) ? data.freezes : [],
  };
}

function getQaAnswer(
  items: QA[] | undefined,
  questionIncludes: string,
  fallback = "",
) {
  const found = (items || []).find((item) =>
    String(item?.question || "")
      .toLowerCase()
      .includes(questionIncludes.toLowerCase()),
  );
  return found?.answers?.[0] || fallback;
}

function firstValue(...values: Array<string | null | undefined>) {
  return values.find((value) => String(value || "").trim()) || "";
}

function getInitialForm(profile: BrandProfile | null): FormState {
  return {
    profilePic: firstValue(profile?.profilePic, ""),
    brandName: firstValue(profile?.brandName, profile?.name, "Nike"),
    brandEmail: firstValue(profile?.email, "Brand@nike.com"),
    companySize: firstValue(profile?.companySize, "5-10"),
    pocName: firstValue(
      profile?.name,
      getQaAnswer(profile?.page1, "poc"),
      "Aditya",
    ),
    brandEmailAlias: firstValue(
      profile?.proxyEmail,
      getQaAnswer(profile?.page1, "email alias"),
      "nike@mail.collabglam.com",
    ),
    industry: firstValue(profile?.industry, "Brand@nike.com"),
    pocContact: firstValue(
      profile?.phone,
      profile?.contact,
      profile?.mobile,
      getQaAnswer(profile?.page1, "contact"),
      "999-999-9999",
    ),
    website: firstValue(
      profile?.website,
      getQaAnswer(profile?.page1, "website"),
      "www.nike.com",
    ),
    companyDetails: firstValue(
      getQaAnswer(profile?.page2, "company details"),
      getQaAnswer(profile?.page1, "company details"),
      "",
    ),
    brandType: firstValue(
      getQaAnswer(profile?.page1, "brand type"),
      getQaAnswer(profile?.page1, "type of brand"),
      "Footwear",
    ),
    role: firstValue(
      getQaAnswer(profile?.page2, "role"),
      getQaAnswer(profile?.page1, "role"),
      "Campaign Manager",
    ),
    platform: firstValue(
      getQaAnswer(profile?.page3, "preferred platform"),
      getQaAnswer(profile?.page3, "platform"),
      "Youtube",
    ),
    timezone: firstValue(
      profile?.timezone,
      getQaAnswer(profile?.page3, "time zone"),
      "GMT+5:30 Indian standard time",
    ),
    currency: firstValue(
      profile?.currency,
      getQaAnswer(profile?.page3, "currency"),
      "$ Dollars",
    ),
    region: firstValue(
      profile?.region,
      profile?.country,
      getQaAnswer(profile?.page3, "country"),
      getQaAnswer(profile?.page3, "region"),
      "All",
    ),
    language: firstValue(
      profile?.language,
      profile?.contentLanguage,
      getQaAnswer(profile?.page3, "preferred language"),
      getQaAnswer(profile?.page3, "language"),
      "English",
    ),
  };
}

function initialsFromName(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return "B";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function BrandProfilePage() {
  const [brandId, setBrandId] = useState("");
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [, setWallet] = useState<WalletData | null>(null);
  const [form, setForm] = useState<FormState>(() => getInitialForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showProfileAlert, setShowProfileAlert] = useState(true);
  const [countryOptions, setCountryOptions] = useState<string[]>(() => [
    ...DEFAULT_COUNTRY_OPTIONS,
  ]);
  const [languageOptions, setLanguageOptions] = useState<string[]>(() => [
    ...DEFAULT_LANGUAGE_OPTIONS,
  ]);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraSessionRef = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    const storedBrandId =
      typeof window !== "undefined"
        ? localStorage.getItem("brandId") ||
          localStorage.getItem("brand_id") ||
          localStorage.getItem("userId") ||
          ""
        : "";

    if (!storedBrandId) {
      setLoading(false);
      toast({
        icon: "error",
        title: "Brand ID missing",
        text: "brandId was not found in localStorage.",
      });
      return;
    }

    setBrandId(storedBrandId);
  }, []);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLists = async () => {
      const [countriesResult, languagesResult] = await Promise.allSettled([
        fetchListOptions(
          "/list/countries?limit=300",
          "country",
          DEFAULT_COUNTRY_OPTIONS,
        ),
        fetchListOptions(
          "/list/content-languages?limit=300",
          "language",
          DEFAULT_LANGUAGE_OPTIONS,
        ),
      ]);

      if (!active) return;

      if (countriesResult.status === "fulfilled") {
        setCountryOptions(countriesResult.value);
      }

      if (languagesResult.status === "fulfilled") {
        setLanguageOptions(languagesResult.value);
      }
    };

    loadLists();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!brandId) return;

    const run = async () => {
      try {
        setLoading(true);

        const [profileRes, walletRes] = await Promise.all([
          apiGetBrandProfile(brandId),
          apiGetBrandWallet({ brandId }),
        ]);

        const profile = profileRes as BrandProfile;
        setBrand(profile);
        setWallet(normalizeWalletData(walletRes as WalletApiPayload));
        setForm(getInitialForm(profile));
      } catch (err) {
        toast({
          icon: "error",
          title: "Failed to load profile",
          text: getApiErrorMessage(
            err,
            "Something went wrong while fetching brand profile.",
          ),
        });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [brandId]);

  const displayName = useMemo(
    () => brand?.brandName || brand?.name || form.brandName || "Nike",
    [brand?.brandName, brand?.name, form.brandName],
  );

  const logo = form.profilePic || brand?.profilePic || "";

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onCancel = () => {
    setEditing(false);
    setForm(getInitialForm(brand));
  };

  const handleImageFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        icon: "error",
        title: "Invalid file",
        text: "Please upload an image file for your profile photo.",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange("profilePic", String(reader.result || ""));
      event.target.value = "";
    };
    reader.onerror = () => {
      toast({
        icon: "error",
        title: "Upload failed",
        text: "Unable to read the selected image. Please try another file.",
      });
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCamera = () => {
    cameraSessionRef.current += 1;
    stopCamera();
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraError("");
  };

  const openCamera = async () => {
    if (formLocked) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      setCameraOpen(true);
      setCameraLoading(true);
      setCameraError("");
      stopCamera();

      const sessionId = cameraSessionRef.current + 1;
      cameraSessionRef.current = sessionId;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });

      if (sessionId !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      cameraStreamRef.current = stream;

      const attachStream = () => {
        if (sessionId !== cameraSessionRef.current) return;

        if (!videoRef.current) {
          window.setTimeout(attachStream, 0);
          return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      };

      attachStream();
    } catch (err) {
      setCameraError(
        "Camera permission was blocked or no camera was found. You can still choose a photo from your device.",
      );
      cameraInputRef.current?.click();
    } finally {
      setCameraLoading(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video) {
      setCameraError("Camera is not ready yet. Please try again.");
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    onChange("profilePic", canvas.toDataURL("image/png"));
    closeCamera();
  };

  const onSave = async () => {
    if (!brandId) return;

    try {
      setSaving(true);

      let profilePicToSave = form.profilePic;

      if (profilePicToSave.startsWith("data:image/")) {
        profilePicToSave = await apiUpdateBrandProfilePhoto(profilePicToSave);
        setForm((prev) => ({ ...prev, profilePic: profilePicToSave }));
      }

      await apiUpdateBrandProfile({
        brandId,
        profilePic: profilePicToSave,
        dataUrl: profilePicToSave,
        brandName: form.brandName,
        name: form.pocName,
        email: form.brandEmail,
        proxyEmail: form.brandEmailAlias,
        companySize: form.companySize,
        brandType: form.brandType,
        industry: form.industry,
        phone: form.pocContact,
        contact: form.pocContact,
        mobile: form.pocContact,
        website: form.website,
        companyDetails: form.companyDetails,
        role: form.role,
        platform: form.platform,
        timezone: form.timezone,
        currency: form.currency,
        region: form.region,
        country: form.region,
        language: form.language,
        contentLanguage: form.language,
        page1: [
          { question: "Tell us about brand type?", answers: [form.brandType] },
          { question: "POC Name", answers: [form.pocName] },
          { question: "POC Contact", answers: [form.pocContact] },
          { question: "Website", answers: [form.website] },
          { question: "Company Size", answers: [form.companySize] },
          { question: "Brand Email Alias", answers: [form.brandEmailAlias] },
        ],
        page2: [
          { question: "Company Details", answers: [form.companyDetails] },
          {
            question: "Tell us about your role in Organisation ?",
            answers: [form.role],
          },
        ],
        page3: [
          { question: "Preferred platform?", answers: [form.platform] },
          { question: "Time zone", answers: [form.timezone] },
          { question: "Currency format", answers: [form.currency] },
          { question: "Select Country", answers: [form.region] },
          { question: "Select Region", answers: [form.region] },
          {
            question: "What is your preferred language ?",
            answers: [form.language],
          },
        ],
      } as any);

      const updatedProfile = (await apiGetBrandProfile(
        brandId,
      )) as BrandProfile;
      setBrand(updatedProfile);
      setForm(getInitialForm(updatedProfile));
      setEditing(false);

      toast({
        icon: "success",
        title: "Profile updated",
        text: "Your brand profile was updated successfully.",
      });
    } catch (err) {
      toast({
        icon: "error",
        title: "Update failed",
        text: getApiErrorMessage(err, "Unable to save brand profile."),
      });
    } finally {
      setSaving(false);
    }
  };

  const formLocked = loading;

  return (
    <div className={pageClass}>
      <ToastStyles />

      <main className={frameClass}>
        {showProfileAlert ? (
          <ProfileAlert onClose={() => setShowProfileAlert(false)} />
        ) : null}

        <section className={`flex w-full items-start justify-between gap-8 ${showProfileAlert ? "mt-5" : ""}`}>
          <div>
            <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.02em] text-[#202020]">
              Profile
            </h1>
            <p className="mt-2 text-[14px] leading-5 text-[#a0a0a0]">
              This is where you manage profile details specific to you. To
              manage what communication you receive from Collabglam.
            </p>
          </div>

          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing(true)}
            className="mt-0 inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] border border-[#dedede] bg-white px-5 text-[14px] font-semibold text-[#232323] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:bg-[#fafafa]"
          >
            <PencilLine className="h-4 w-4" />
            Edit Profile
          </button>
        </section>

        <section className="w-full pt-[56px]">
          <h2 className={sectionLabelClass}>Profile Picture</h2>

          <div className="mt-6 flex items-center gap-[31px]">
            <div className="flex h-[116px] w-[116px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-[30px] font-semibold text-white">
              {logo ? (
                <img
                  src={logo}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initialsFromName(displayName)}</span>
              )}
            </div>

            <div className="pt-1">
              <p className="text-[17px] font-semibold leading-6 text-[#252525]">
                Upload your photo
              </p>
              <p className="text-[12px] font-medium leading-5 text-[#a5a5a5]">
                Photo should be at least 250px x 250px
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={formLocked}
                  onClick={() => uploadInputRef.current?.click()}
                  className="inline-flex h-[34px] items-center gap-2 rounded-[7px] bg-black px-[18px] text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  upload
                </button>
                <button
                  type="button"
                  disabled={formLocked}
                  onClick={openCamera}
                  className="inline-flex h-[34px] items-center gap-2 rounded-[7px] border border-[#dfdfdf] bg-white px-[13px] text-[12px] font-semibold text-[#232323] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Take a Photo
                </button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleImageFile}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </section>

        {cameraOpen ? (
          <CameraCaptureModal
            videoRef={videoRef}
            loading={cameraLoading}
            error={cameraError}
            onClose={closeCamera}
            onCapture={capturePhoto}
          />
        ) : null}

        <section className="w-full pt-[56px]">
          <h2 className={sectionLabelClass}>Personal Info</h2>

          <div className="mt-6 grid grid-cols-3 gap-x-[22px] gap-y-5">
            <ProfileInput
              label="Brand Name"
              value={form.brandName}
              disabled={formLocked}
              onChange={(value) => onChange("brandName", value)}
            />
            <ProfileInput
              label="Brand Email"
              value={form.brandEmail}
              disabled
              muted
            />
            <ProfileInput
              label="Company Size"
              value={form.companySize}
              disabled={formLocked}
              onChange={(value) => onChange("companySize", value)}
            />
            <ProfileInput
              label="POC Name"
              value={form.pocName}
              disabled={formLocked}
              onChange={(value) => onChange("pocName", value)}
            />
            <ProfileInput
              label="Brand Email Alias"
              value={form.brandEmailAlias}
              disabled
              muted
              info
            />
            <ProfileInput
              label="Industry Name"
              value={form.industry}
              disabled={formLocked}
              onChange={(value) => onChange("industry", value)}
            />
            <ProfileInput
              label="POC Contact"
              value={form.pocContact}
              disabled={formLocked}
              onChange={(value) => onChange("pocContact", value)}
            />
            <ProfileInput
              label="Website"
              value={form.website}
              disabled={formLocked}
              onChange={(value) => onChange("website", value)}
            />
          </div>
        </section>

        <section className="w-full pt-[56px]">
          <div className="relative min-h-[292px] rounded-[14px] border border-[#dedede] bg-white px-[13px] py-[18px]">
            <div>
              <p className="text-[15px] font-medium leading-5 text-[#9b9b9b]">
                Company Details
              </p>
            </div>
            <textarea
              value={form.companyDetails}
              disabled={formLocked}
              onChange={(event) =>
                onChange("companyDetails", event.target.value)
              }
              placeholder={
                "Describe your campaign goals, product details, and what creators should focus on.\n\nYou can paste links to your website, product pages, reference videos, or brand guidelines."
              }
              className="mt-[30px] h-[205px] w-full resize-none border-none bg-transparent text-[14px] font-medium leading-7 text-[#232323] outline-none placeholder:text-[#c7c7c7] disabled:cursor-not-allowed"
            />
          </div>
        </section>

        <section className="w-full pt-[56px]">
          <h2 className={sectionLabelClass}>Onboarding Questions</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-[22px] gap-y-5">
            <ProfileInput
              label="Tell us about brand type?"
              value={form.brandType}
              disabled={formLocked}
              onChange={(value) => onChange("brandType", value)}
            />
            <ProfileInput
              label="Tell us about your role in Organisation ?"
              value={form.role}
              disabled={formLocked}
              onChange={(value) => onChange("role", value)}
            />
            <PlatformField
              value={form.platform}
              disabled={formLocked}
              onChange={(value) => onChange("platform", value)}
            />
          </div>
        </section>

        <section className="w-full pt-[56px]">
          <h2 className={sectionLabelClass}>Demographic Details</h2>
          <p className="mt-1 text-[11px] font-medium leading-4 text-[#b8b8b8]">
            When you schedule campaigns, we'll use this time zone as a
            reference.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-x-[22px] gap-y-5">
            <ProfileSelect
              label="Time zone"
              value={form.timezone}
              options={TIMEZONE_OPTIONS}
              disabled={formLocked}
              onChange={(value) => onChange("timezone", value)}
            />
            <ProfileSelect
              label="Currency format"
              value={form.currency}
              options={CURRENCY_OPTIONS}
              disabled={formLocked}
              onChange={(value) => onChange("currency", value)}
            />
            <ProfileSelect
              label="Select Country"
              value={form.region}
              options={countryOptions}
              disabled={formLocked}
              onChange={(value) => onChange("region", value)}
            />
            <ProfileSelect
              label="Preferred language"
              value={form.language}
              options={languageOptions}
              disabled={formLocked}
              onChange={(value) => onChange("language", value)}
            />
          </div>
        </section>

        <footer className="flex w-full items-center justify-end gap-[41px] pt-[56px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-[46px] text-[16px] font-bold text-[#232323] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="h-[54px] min-w-[145px] rounded-[13px] border border-[#dedede] bg-white px-8 text-[16px] font-bold text-[#232323] shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update"}
          </button>
        </footer>
      </main>
    </div>
  );
}

function CameraCaptureModal({
  videoRef,
  loading,
  error,
  onClose,
  onCapture,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  loading: boolean;
  error: string;
  onClose: () => void;
  onCapture: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-[460px] overflow-hidden rounded-[20px] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
        <div className="flex h-[58px] items-center justify-between border-b border-[#ededed] px-5">
          <p className="text-[17px] font-semibold text-[#232323]">
            Take a Photo
          </p>
          <button
            type="button"
            aria-label="Close camera"
            onClick={onClose}
            className="rounded-full p-1 text-[#555555] transition hover:bg-[#f2f2f2]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-square w-full object-cover"
          />
        </div>

        {loading ? (
          <p className="px-5 pt-4 text-[13px] font-medium text-[#777777]">
            Opening camera...
          </p>
        ) : null}

        {error ? (
          <p className="px-5 pt-4 text-[13px] font-medium text-[#d2452f]">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            className="h-[42px] rounded-[10px] border border-[#dedede] bg-white px-5 text-[14px] font-semibold text-[#232323] transition hover:bg-[#fafafa]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCapture}
            disabled={loading}
            className="h-[42px] rounded-[10px] bg-black px-5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Capture Photo
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileAlert({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-[69px] w-full items-center justify-between rounded-[7px] bg-[#ffe9e0] px-[19px]">
      <div className="flex items-center gap-[13px]">
        <AlertCircle className="h-[21px] w-[21px] text-[#ff623a]" />
        <div>
          <p className="text-[14px] font-bold leading-5 text-[#3a3a3a]">
            Profile Not Completed.
          </p>
          <p className="text-[13px] font-medium leading-5 text-[#a99a95]">
            Complete the onboarding questions to finish setting up your account.
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Close alert"
        onClick={onClose}
        className="p-1 text-[#333333] transition hover:opacity-70"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  placeholder,
  disabled,
  muted,
  info,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  muted?: boolean;
  info?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="absolute left-3 top-[11px] z-10 flex items-center gap-1 text-[14px] font-medium leading-5 text-[#a2a2a2]">
        {label}
        {info ? <Info className="h-3.5 w-3.5 text-[#b8b8b8]" /> : null}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={`${fieldBaseClass} ${muted ? fieldDisabledClass : ""}`}
      />
    </label>
  );
}

function ProfileSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const optionList = useMemo(() => {
    const seen = new Set<string>();
    return [value, ...options]
      .map((option) => String(option || "").trim())
      .filter(Boolean)
      .filter((option) => {
        const key = option.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return optionList;

    return optionList.filter((option) => option.toLowerCase().includes(query));
  }, [optionList, search]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || wrapperRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setSearch("");
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`relative h-[58px] w-full rounded-[12px] border bg-white px-3 pb-[8px] pt-[24px] text-left text-[15px] font-medium leading-5 text-[#232323] outline-none transition disabled:cursor-not-allowed ${
          open
            ? "rounded-[16px] border-2 border-black shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
            : "border-[#dedede] hover:border-[#cfcfcf]"
        }`}
      >
        <span className="absolute left-3 top-[8px] z-10 text-[13px] font-medium leading-5 text-[#a2a2a2]">
          {label}
        </span>
        <span className="block truncate pr-10">{value || label}</span>
        <ChevronDown
          className={`pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b8b8b8] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-[16px] border border-[#d7d7d7] bg-white shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
          <div className="flex h-[50px] items-center gap-3 border-b border-[#d8d8d8] px-4">
            <Search className="h-5 w-5 shrink-0 text-[#777777]" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              className="h-full w-full bg-transparent text-[17px] font-normal leading-none text-[#232323] outline-none placeholder:text-[#8f8f8f]"
            />
          </div>

          <div className="max-h-[260px] overflow-y-auto py-2">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const selected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`block w-[calc(100%-16px)] rounded-[7px] px-4 py-2.5 text-left text-[16px] font-normal leading-6 text-[#242424] transition hover:bg-[#eeeeee] ${
                      selected ? "mx-2 bg-[#e9e9e9]" : "mx-2 bg-white"
                    }`}
                  >
                    {option}
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-5 text-[15px] font-medium text-[#8f8f8f]">
                No results found
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlatformField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block max-w-[529px]">
      <span className="absolute left-3 top-[11px] z-10 text-[14px] font-medium leading-5 text-[#a2a2a2]">
        Preferred platform?
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-[70px] w-full appearance-none rounded-[12px] border border-[#dedede] bg-white px-3 pb-[10px] pt-[31px] text-[0px] outline-none transition focus:border-[#cfcfcf] focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed"
      >
        {PLATFORM_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute bottom-[12px] left-3 flex items-center gap-1.5">
        <SocialDot type="youtube" active={value.toLowerCase() === "youtube"} />
        <SocialDot
          type="instagram"
          active={value.toLowerCase() === "instagram"}
        />
        <SocialDot type="tiktok" active={value.toLowerCase() === "tiktok"} />
      </div>
    </label>
  );
}

function SocialDot({
  type,
  active,
}: {
  type: "youtube" | "instagram" | "tiktok";
  active: boolean;
}) {
  const classes = {
    youtube: "bg-[#ff0000] text-white",
    instagram:
      "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white",
    tiktok: "bg-black text-white",
  }[type];

  const label = {
    youtube: "▶",
    instagram: "●",
    tiktok: "♪",
  }[type];

  return (
    <span
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${classes} ${active ? "ring-2 ring-black/10" : "opacity-70"}`}
    >
      {label}
    </span>
  );
}
