export async function uploadToDrive(buffer, fileName) {
  const base64 = buffer.toString('base64');
  
  const response = await fetch(process.env.GAS_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({
      base64: base64,
      fileName: fileName
    }),
    headers: { 'Content-Type': 'application/json' }
  });

  const result = await response.json();
  if (result.status === 'success') {
    return { id: result.id };
  } else {
    throw new Error(result.message);
  }
}
