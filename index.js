'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const pg = require('pg');
const methodOverride = require('method-override');
const cors = require('cors');
const superagent = require('superagent');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
const client = new pg.Client(process.env.DATABASE_URL);
const PORT = process.env.PORT || 3000;



app.get('/allcountries', (req, res) => {
    let url = 'https://api.covid19api.com/summary';
    superagent.get(url)
        .then(result => {
            // console.log(result.body);
            const allResults = result.body.Countries.map(data => {
                return new Country(data);
            });
            res.render('allCountries', { data: allResults });
        })
        .catch(err => {
            res.send(err);
        });
});

app.post('/savetodb', (req, res) => {
    let sql = 'insert into covid (country,total_confirmed, total_deaths , total_recovered ,date) values ($1,$2,$3,$4,$5) returning *;';
    const { country, total_confirmed, total_deaths, total_recovered, date } = req.body;
    let safeVals = [country, total_confirmed, total_deaths, total_recovered, date];
    client.query(sql, safeVals)
        .then(result => {
            res.redirect('/myrecords');
        })
        .catch(err => {
            res.render('err', { err: err });
        });
});

app.get('/myrecords', (req, res) => {
    let sql = 'select * from covid';
    client.query(sql)
        .then(result => {
            res.render('myRecords', { data: result.rows });
        })
        .catch(err => {
            res.render('err', { err: err });
        });
});

app.get('/details/:id', (req, res) => {
    let sql = ' select * from covid where id=$1;';
    let safeVal = [req.params.id];
    client.query(sql, safeVal)
        .then(result => {
            res.render('details', { data: result.rows });
        })
        .catch(err => {
            res.render('err', { err: err });
        });
});

app.put('/update/:id', (req, res) => {
    let sql = 'update covid set country=$1, total_confirmed=$2,total_deaths=$3,total_recovered=$4,date=$5 where id=$6;';
    const { country, total_confirmed, total_deaths, total_recovered, date } = req.body;
    let safeVals = [country, total_confirmed, total_deaths, total_recovered, date, req.params.id];
    client.query(sql, safeVals)
        .then(result => {
            res.redirect(`/details/${req.params.id}`);
        })
        .catch(err => {
            res.render('err', { err: err });
        });
});

app.delete('/delete/:id', (req, res) => {
    let sql = 'delete from covid where id=$1;';
    let safeVal = [req.params.id];
    client.query(sql, safeVal)
        .then(() => {
            res.redirect('/myrecords');
        })
        .catch(err => {
            res.render('err', { err: err });
        });
});

// country,total_cases, total_deathes, total_recoverd,date
function Country(data) {
    this.country = data.Country;
    this.total_confirmed = data.TotalConfirmed;
    this.total_deaths = data.TotalDeaths;
    this.total_recovered = data.TotalRecovered;
    this.date = data.Date;
}

// https://api.covid19api.com/live/country/south-africa/status/confirmed/date/2020-03-21T13:13:30Z

app.get('/home', (req, res) => {
    res.render('home');
});

app.post('/result', (req, res) => {

    let country = req.body.country;
    let date = req.body.date;
    let url = `https://api.covid19api.com/live/country/${country}/status/confirmed/date/${date}`;
    superagent.get(url)
        .then(result => {
            console.log(result.body)
            let data = result.body.map(data => {
                return new Result(data);
            });
            res.render('result', { data: data });
        })
        .catch(err => {
            res.render('err', { err: err });
        });
});

function Result(data) {
    this.country = data.Country;
    this.confirmed = data.Confirmed;
    this.date = data.date;
}

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`up to port ${PORT}`);
        });
    });
