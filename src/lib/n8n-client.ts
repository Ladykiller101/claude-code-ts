const N8N_BASE_URL =
  process.env.NEXT_PUBLIC_N8N_BASE_URL ||
  "https://teamdialloai.app.n8n.cloud";

export const N8N_WEBHOOKS = {
  ticketCreate: `${N8N_BASE_URL}/webhook/finflow-ticket-create`,
  hrEvent: `${N8N_BASE_URL}/webhook/finflow-hr-event`,
  appointment: `${N8N_BASE_URL}/webhook/finflow-appointment`,
  chatbot: `${N8N_BASE_URL}/webhook/finflow-chatbot`,
};

export async function callN8n(
  webhookUrl: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error");
    throw new Error(`n8n webhook failed (${response.status}): ${error}`);
  }

  return response.json();
}
