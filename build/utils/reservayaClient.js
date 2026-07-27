"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservaYaAdmin = void 0;
/**
 * Calls the ReservaYa API to create an admin user for a newly registered company.
 * Uses the landing user's email so they can log into ReservaYa with their own email.
 * Returns the credentials on success, or null if the call fails (company creation is not aborted).
 */
const createReservaYaAdmin = async (name, user_name, password, phone, companyId) => {
    const baseUrl = process.env.RESERVAYA_API_URL;
    if (!baseUrl) {
        console.warn("⚠️ RESERVAYA_API_URL no configurada. No se creó el admin de ReservaYa.");
        return null;
    }
    try {
        const response = await fetch(`${baseUrl}/api/auth/create-admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, user_name, password, phone, companyId }),
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            console.error(`⚠️ ReservaYa API respondió con ${response.status}:`, body);
            return null;
        }
        console.log(`✅ Admin de ReservaYa creado para: ${user_name}`);
        return { user_name, password };
    }
    catch (error) {
        console.error("⚠️ Error al llamar a la API de ReservaYa:", error);
        return null;
    }
};
exports.createReservaYaAdmin = createReservaYaAdmin;
