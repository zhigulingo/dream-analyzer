module.exports = (req, res) => {
    res.status(200).json({
        status: 'alive',
        message: 'Test function is working!',
        timestamp: new Date().toISOString()
    });
};
