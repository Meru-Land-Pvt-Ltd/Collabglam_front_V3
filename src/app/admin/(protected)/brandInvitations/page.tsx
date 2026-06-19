"use client";

import { useEffect, useMemo, useState } from "react";
import { post } from "@/lib/api";

type EmailTemplate = {
    from?: string | null;
    subject?: string | null;
    text?: string | null;
    html?: string | null;
    cc?: string[];
    bcc?: string[];
    replyTo?: string[];
    attachmentNames?: string[];
};

type MissingEmailCampaign = {
    campaignId?: string | null;
    campaignName?: string | null;
    emailTemplate?: EmailTemplate | null;
};

type Invitation = {
    brandName?: string | null;
    campaignName?: string | null;
    creatorTitle?: string | null;
    handle?: string | null;

    email?: string | null;
    emailTo?: string | null;
    emailFrom?: string | null;
    emailSubject?: string | null;

    followUpEmailTo?: string | null;
    followUpEmailFrom?: string | null;
    followUpSubject?: string | null;

    campaignId?: string | null;
    campaign?: {
        campaignTitle?: string | null;
        brandName?: string | null;
    } | null;

    emailTemplate?: EmailTemplate | null;

    missingEmail?: {
        email?: string | null;
        campaigns?: MissingEmailCampaign[];
    } | null;
};

export default function InvitationsPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        try {
            setLoading(true);
            setError("");

            const result = await post("/newinvitations/getall", {});

            // Supports both: { data: [...] } and [...]
            setInvitations(Array.isArray(result) ? result : result?.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const selectedEmailTemplate = useMemo(() => {
        if (!selectedInvitation) return null;
        return getEmailTemplate(selectedInvitation);
    }, [selectedInvitation]);

    return (
        <div className="min-h-screen p-6">
            <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                            Loading invitations...
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-sm text-red-600">{error}</div>
                    ) : invitations.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                            No invitations found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] border-collapse text-left">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                                            Brand Name
                                        </th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                                            Campaign Name
                                        </th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                                            Influencer Name
                                        </th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                                            From Email
                                        </th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                                            To Email
                                        </th>
                                        {/* <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                                            View
                                        </th> */}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {invitations.map((invitation, index) => {
                                        const template = getEmailTemplate(invitation);

                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-800">
                                                    {invitation.brandName ||
                                                        invitation.campaign?.brandName ||
                                                        "N/A"}
                                                </td>

                                                <td className="px-4 py-3 text-sm text-gray-800">
                                                    {invitation.campaignName ||
                                                        invitation.campaign?.campaignTitle ||
                                                        "N/A"}
                                                </td>

                                                <td className="px-4 py-3 text-sm text-gray-800">
                                                    {invitation.creatorTitle || invitation.handle || "N/A"}
                                                </td>

                                                <td className="px-4 py-3 text-sm text-gray-800">
                                                    {template?.from ||
                                                        invitation.emailFrom ||
                                                        invitation.followUpEmailFrom ||
                                                        "N/A"}
                                                </td>

                                                <td className="px-4 py-3 text-sm text-gray-800">
                                                    {invitation.emailTo ||
                                                        invitation.followUpEmailTo ||
                                                        invitation.email ||
                                                        invitation.missingEmail?.email ||
                                                        "N/A"}
                                                </td>

                                                {/* <td className="px-4 py-3 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedInvitation(invitation)}
                                                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                                                    >
                                                        View
                                                    </button>
                                                </td> */}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {selectedInvitation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Email Template
                            </h2>

                            <button
                                type="button"
                                onClick={() => setSelectedInvitation(null)}
                                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            >
                                Close
                            </button>
                        </div>

                        <div className="max-h-[75vh] overflow-y-auto p-6">
                            <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                                <div>
                                    <span className="font-semibold text-gray-700">From: </span>
                                    <span className="text-gray-800">
                                        {selectedEmailTemplate?.from ||
                                            selectedInvitation.emailFrom ||
                                            selectedInvitation.followUpEmailFrom ||
                                            "N/A"}
                                    </span>
                                </div>

                                <div>
                                    <span className="font-semibold text-gray-700">To: </span>
                                    <span className="text-gray-800">
                                        {selectedInvitation.emailTo ||
                                            selectedInvitation.followUpEmailTo ||
                                            selectedInvitation.email ||
                                            selectedInvitation.missingEmail?.email ||
                                            "N/A"}
                                    </span>
                                </div>

                                <div>
                                    <span className="font-semibold text-gray-700">Subject: </span>
                                    <span className="text-gray-800">
                                        {selectedEmailTemplate?.subject ||
                                            selectedInvitation.emailSubject ||
                                            selectedInvitation.followUpSubject ||
                                            "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200">
                                <div className="border-b bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
                                    Message
                                </div>

                                <pre className="whitespace-pre-wrap break-words p-4 text-sm leading-6 text-gray-800">
                                    {getEmailBody(selectedEmailTemplate)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getEmailTemplate(invitation: Invitation): EmailTemplate | null {
    if (invitation.emailTemplate) {
        return invitation.emailTemplate;
    }

    const matchingCampaignTemplate = invitation.missingEmail?.campaigns?.find(
        (campaign) => campaign.campaignId === invitation.campaignId
    )?.emailTemplate;

    if (matchingCampaignTemplate) {
        return matchingCampaignTemplate;
    }

    return invitation.missingEmail?.campaigns?.[0]?.emailTemplate || null;
}

function getEmailBody(template: EmailTemplate | null): string {
    if (!template) {
        return "No email template available.";
    }

    if (template.text) {
        return template.text;
    }

    if (template.html) {
        return stripHtml(template.html);
    }

    return "No email template available.";
}

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}