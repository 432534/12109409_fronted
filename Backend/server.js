const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');
const cors = require('cors');
const app = express();
const PORT = 3000;
app.use(cors());
let bookingsData = [];
fs.createReadStream('hotel_bookings_1000.csv')
    .pipe(csv())
    .on('data', (row) => {
        const bookingDate = moment(`${row.arrival_date_year}-${row.arrival_date_month}-${row.arrival_date_day_of_month}`, 'YYYY-MMMM-D');
        bookingsData.push({
            date: bookingDate,
            adults: parseInt(row.adults) || 0,
            children: parseInt(row.children) || 0,
            babies: parseInt(row.babies) || 0,
            country: row.country
        });
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
    });
app.get('/api/data', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide startDate and endDate query parameters' });
    }
    const start = moment(startDate, 'YYYY-MM-DD');
    const end = moment(endDate, 'YYYY-MM-DD');
    const filteredData = bookingsData.filter((booking) => {
        return booking.date.isBetween(start, end, null, '[]');
    });
    const timeSeriesData = {};
    const countryData = {};
    let totalAdultVisitors = 0;
    let totalChildrenVisitors = 0;
    filteredData.forEach((booking) => {
        const dateStr = booking.date.format('YYYY-MM-DD');
        if (!timeSeriesData[dateStr]) {
            timeSeriesData[dateStr] = 0;
        }
        timeSeriesData[dateStr] += booking.adults + booking.children + booking.babies;
        if (!countryData[booking.country]) {
            countryData[booking.country] = 0;
        }
        countryData[booking.country] += booking.adults + booking.children + booking.babies;
        totalAdultVisitors += booking.adults;
        totalChildrenVisitors += booking.children;
    });
    const formattedTimeSeriesData = Object.keys(timeSeriesData).map(date => ({
        x: moment(date).toISOString(),
        y: timeSeriesData[date]
    }));
    const formattedCountryData = Object.keys(countryData).map(country => ({
        country,
        visitors: countryData[country]
    }));
    res.json({
        timeSeriesData: formattedTimeSeriesData,
        countryData: formattedCountryData,
        totalAdultVisitors,
        totalChildrenVisitors
    });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
