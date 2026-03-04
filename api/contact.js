export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    first_name,
    last_name,
    email,
    phone,
    company,
    industry,
    message,
  } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'HubSpot token not configured.' });
  }

  try {
    // 1. Create or update contact in HubSpot
    const contactPayload = {
      properties: {
        firstname: first_name,
        lastname: last_name,
        email: email,
        ...(phone && { phone }),
        ...(company && { company }),
        ...(industry && { industry }),
        ...(message && { message }),
        lead_source: 'Website Contact Form',
      },
    };

    const contactRes = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contactPayload),
      }
    );

    let contactData = null;

    if (contactRes.ok) {
      contactData = await contactRes.json();
    } else {
      const errText = await contactRes.text();
      // If contact already exists (409), fetch their ID and update
      if (contactRes.status === 409) {
        // Extract existing contact ID from error message and update
        const searchRes = await fetch(
          'https://api.hubapi.com/crm/v3/objects/contacts/search',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              filterGroups: [
                {
                  filters: [
                    { propertyName: 'email', operator: 'EQ', value: email },
                  ],
                },
              ],
            }),
          }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            contactData = searchData.results[0];
          }
        }
      } else {
        console.error('HubSpot contact error:', errText);
        return res.status(500).json({ error: 'Failed to create contact in CRM.' });
      }
    }

    // 2. Create a note/engagement with the message so it appears in the contact timeline
    if (contactData && message) {
      const noteBody = [
        `New website inquiry from ${first_name} ${last_name}`,
        `Company: ${company || 'Not provided'}`,
        `Industry: ${industry || 'Not provided'}`,
        `Phone: ${phone || 'Not provided'}`,
        ``,
        `Message:`,
        message,
      ].join('\n');

      await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          properties: {
            hs_note_body: noteBody,
            hs_timestamp: new Date().toISOString(),
          },
          associations: [
            {
              to: { id: contactData.id },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 202,
                },
              ],
            },
          ],
        }),
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
