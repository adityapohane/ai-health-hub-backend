
const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");

const addressByZip = async (req, res) => {
    try {
        const { zipcode } = req.query;
        if (!zipcode) {
            return res.status(400).json({ error: 'zipcode is required' });
        }
        
        if(zipcode.length != 5){
            return res.status(400).json({ error: 'zipcode must be 5 digits' });
        }
        const [rows] = await connection.query('SELECT city_name,city_id,state_name,states.state_id FROM cities left join states ON states.state_id=cities.fk_state_id WHERE zipcode = ?', [zip]);
        return res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    addressByZip
};