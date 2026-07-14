const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { id } = req.body;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/attendance_logs?id=eq.${id}`,
        {
            method: "DELETE",
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        }
    );

    if (!response.ok) {
        return res.status(response.status).json({
            error: await response.text()
        });
    }

    res.status(200).json({
        success: true
    });
};