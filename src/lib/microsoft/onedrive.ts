import { Client } from '@microsoft/microsoft-graph-client';

// Função para obter um access_token válido usando o Refresh Token
async function getAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const refreshToken = process.env.AZURE_REFRESH_TOKEN;

  if (!tenantId || !clientId || !clientSecret || !refreshToken) {
    throw new Error('Configurações do Azure ausentes no .env.local');
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'https://graph.microsoft.com/Files.ReadWrite offline_access',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Falha ao renovar access token: ${data.error_description || data.error}`
    );
  }

  return data.access_token;
}

export function getGraphClient() {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (error) {
        done(error as Error, null);
      }
    },
  });
}

export async function uploadFileToOneDrive(
  fileBuffer: Buffer,
  fileName: string,
  courseName: string
) {
  const client = getGraphClient();

  const folderPath = `Unidades Curriculares/${courseName.replace(/[/\\?%*:|"<>]/g, '_')}`;
  const filePath = `${folderPath}/${Date.now()}_${fileName}`;

  const endpoint = `/me/drive/root:/${filePath}:/content`;

  const response = await client.api(endpoint).put(fileBuffer);

  return {
    onedrive_item_id: response.id as string,
    web_url: response.webUrl as string,
  };
}

export async function deleteFileFromOneDrive(itemId: string): Promise<void> {
  const client = getGraphClient();

  try {
    await client.api(`/me/drive/items/${itemId}`).delete();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao apagar ficheiro do OneDrive: ${errorMessage}`);
  }
}