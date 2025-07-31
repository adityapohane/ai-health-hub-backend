const mailSender = require("../../utils/mailSender");

const sendIntake = async (req, res) => {
    try {
        const { email, url } = req.body;

        if (!email || !url) {
            return res.status(400).json({
                success: false,
                message: "Email and URL are required"
            });
        }

        await mailSender(
            email,
            "Patient Intake Form",
            `Your link to fill the patient intake form: ${url}. Please click this link to continue.`
        );

        return res.status(200).json({
            success: true,
            message: "Intake form link sent successfully"
        });
    } catch (error) {
        console.error("Error sending intake email:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send intake link"
        });
    }
};

module.exports = sendIntake