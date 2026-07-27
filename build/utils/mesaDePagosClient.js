"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDepositQr = void 0;
let cachedToken = null;
const getConfig = () => {
    const baseUrl = process.env.MESADEPAGOS_API_URL;
    const apiKey = process.env.MESADEPAGOS_API_KEY;
    const email = process.env.MESADEPAGOS_EMAIL;
    const password = process.env.MESADEPAGOS_PASSWORD;
    if (!baseUrl || !apiKey || !email || !password) {
        throw new Error("Faltan variables de entorno para el cobro por QR (MESADEPAGOS_API_URL / MESADEPAGOS_API_KEY / MESADEPAGOS_EMAIL / MESADEPAGOS_PASSWORD).");
    }
    return { baseUrl, apiKey, email, password };
};
const decodeJwtExpiration = (token) => {
    try {
        const payloadPart = token.split(".")[1];
        const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf-8"));
        return payload.exp ? payload.exp * 1000 - 60000 : Date.now() + 5 * 60000;
    }
    catch {
        return Date.now() + 5 * 60000;
    }
};
const login = async () => {
    const { baseUrl, apiKey, email, password } = getConfig();
    const response = await fetch(`${baseUrl}/v2/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ email, password }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.accessToken) {
        throw new Error(`No se pudo autenticar el servicio de cobro por QR (HTTP ${response.status}): ${body?.message || "sin detalle"}`);
    }
    cachedToken = {
        accessToken: body.accessToken,
        expiresAt: decodeJwtExpiration(body.accessToken),
    };
    return cachedToken.accessToken;
};
const getAccessToken = async () => {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }
    return login();
};
const generateDepositQr = async (input) => {
    const { baseUrl, apiKey } = getConfig();
    const doRequest = (token) => fetch(`${baseUrl}/v2/transactions/deposit/qr`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            fiatAmount: input.fiatAmount,
            fiatCurrency: input.fiatCurrency,
            referenceId: input.referenceId,
            country: "BO",
            fundingSource: "balance",
            description: input.description || "",
            qrExpirationTime: input.qrExpirationTime || "00:15:00",
        }),
    });
    let token = await getAccessToken();
    let response = await doRequest(token);
    if (response.status === 401) {
        token = await login();
        response = await doRequest(token);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`Error al generar el QR de cobro (HTTP ${response.status}): ${body?.message || JSON.stringify(body)}`);
    }
    return body;
};
exports.generateDepositQr = generateDepositQr;
