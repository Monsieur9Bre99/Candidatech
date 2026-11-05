import { safeUrl } from "../utils/html.js";
import { remoteId } from "../utils/id.js";

export function toRemoteApplication(record, userId) {
    return {
        id: remoteId(record.id),
        user_id: userId,
        company_name: record.company || "",
        role_title: record.role || "",
        applied_on: record.date || null,
        offer_url: safeUrl(record.url || "") || null,
        contract_type: record.contract || "À vérifier",
        cv_version: record.cv || null,
        application_channel: record.channel || null,
        contact_name: record.contact || null,
        status: record.status || "À préparer",
        contacted_on: record.contactDate || null,
        follow_up_due_on: record.followupDate || null,
        follow_up_done_on: record.followupDone || null,
        next_action: record.nextAction || "",
        next_action_due_on: record.dueDate || null,
        notes: record.notes || null,
        created_at: record.createdAt || new Date().toISOString(),
    };
}

export function fromRemoteApplication(record) {
    return {
        id: record.id,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        company: record.company_name,
        role: record.role_title,
        date: record.applied_on || "",
        url: safeUrl(record.offer_url || ""),
        contract: record.contract_type,
        cv: record.cv_version || "",
        channel: record.application_channel || "",
        contact: record.contact_name || "",
        status: record.status,
        contactDate: record.contacted_on || "",
        followupDate: record.follow_up_due_on || "",
        followupDone: record.follow_up_done_on || "",
        nextAction: record.next_action || "",
        dueDate: record.next_action_due_on || "",
        notes: record.notes || "",
    };
}

export function toRemoteCompany(record, userId) {
    return {
        id: remoteId(record.id),
        user_id: userId,
        name: record.name || "",
        sector: record.sector || null,
        location: record.location || null,
        career_url: safeUrl(record.career || "") || null,
        teams: record.teams || null,
        offers: record.offers || null,
        contract_compatibility: record.contract || "À vérifier",
        contact: record.contact || null,
        linkedin_url: safeUrl(record.linkedin || "") || null,
        verified_on: record.verified || null,
        next_action: record.action || null,
        prospecting_status: record.status || "À rechercher",
        notes: record.notes || null,
        created_at: record.createdAt || new Date().toISOString(),
    };
}

export function fromRemoteCompany(record) {
    return {
        id: record.id,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        name: record.name,
        sector: record.sector || "",
        location: record.location || "",
        career: safeUrl(record.career_url || ""),
        teams: record.teams || "",
        offers: record.offers || "",
        contract: record.contract_compatibility,
        contact: record.contact || "",
        linkedin: safeUrl(record.linkedin_url || ""),
        verified: record.verified_on || "",
        action: record.next_action || "",
        status: record.prospecting_status,
        notes: record.notes || "",
    };
}
