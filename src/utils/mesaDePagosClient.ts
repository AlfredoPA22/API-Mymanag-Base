interface MesaDePagosLoginResponse {
  success: boolean;
  accessToken: string;
  message: string;
}

export interface GenerateDepositQrInput {
  fiatAmount: number;
  fiatCurrency: string;
  referenceId: string;
  description?: string;
  qrExpirationTime?: string;
}

export interface GenerateDepositQrResult {
  transactionId: string;
  type: string;
  transactionStatus: string;
  requestedCryptoAmount: string;
  calculatedFiatAmount: string;
  exchangeRate: string;
  asset: string;
  country: string;
  countryName: string;
  qrCodeBase64: string;
  referenceId: string;
  fiatCurrency: string;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export const isMesaDePagosConfigured = (): boolean =>
  !!(
    process.env.MESADEPAGOS_API_URL &&
    process.env.MESADEPAGOS_API_KEY &&
    process.env.MESADEPAGOS_EMAIL &&
    process.env.MESADEPAGOS_PASSWORD
  );

const getConfig = () => {
  const baseUrl = process.env.MESADEPAGOS_API_URL;
  const apiKey = process.env.MESADEPAGOS_API_KEY;
  const email = process.env.MESADEPAGOS_EMAIL;
  const password = process.env.MESADEPAGOS_PASSWORD;

  if (!baseUrl || !apiKey || !email || !password) {
    // No se listan los nombres de las variables en el mensaje: este error
    // puede llegar hasta el cliente (GraphQL error) y no queremos exponer
    // detalles de la configuración interna del servidor.
    throw new Error("El cobro por QR no está disponible en este momento.");
  }

  return { baseUrl, apiKey, email, password };
};

const decodeJwtExpiration = (token: string): number => {
  try {
    const payloadPart = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf-8"));
    return payload.exp ? payload.exp * 1000 - 60_000 : Date.now() + 5 * 60_000;
  } catch {
    return Date.now() + 5 * 60_000;
  }
};

const login = async (): Promise<string> => {
  const { baseUrl, apiKey, email, password } = getConfig();

  const response = await fetch(`${baseUrl}/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({ email, password }),
  });

  const body: MesaDePagosLoginResponse = await response.json().catch(() => ({} as any));

  if (!response.ok || !body?.accessToken) {
    throw new Error(
      `No se pudo autenticar el servicio de cobro por QR (HTTP ${response.status}): ${
        body?.message || "sin detalle"
      }`
    );
  }

  cachedToken = {
    accessToken: body.accessToken,
    expiresAt: decodeJwtExpiration(body.accessToken),
  };

  return cachedToken.accessToken;
};

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  return login();
};

export const generateDepositQr = async (
  input: GenerateDepositQrInput
): Promise<GenerateDepositQrResult> => {
  const { baseUrl, apiKey } = getConfig();

  const doRequest = (token: string) =>
    fetch(`${baseUrl}/v2/transactions/deposit/qr`, {
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
    throw new Error(
      `Error al generar el QR de cobro (HTTP ${response.status}): ${
        body?.message || JSON.stringify(body)
      }`
    );
  }

  return body as GenerateDepositQrResult;
};
