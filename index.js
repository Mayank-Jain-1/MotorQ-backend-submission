require("dotenv").config();
const express = require("express");
const axios = require("axios");
const Airtable = require("airtable");
const cron = require("node-cron");

// Setting Up Express
const app = express();
app.use(express.json());
Airtable.configure({ apiKey: process.env.AIRTABLE_TOKEN_KEY });
const base = Airtable.base(process.env.BASE_ID);

// const coinIds = {};
const coinIds = {
	tron: "rec7tPxGOjeueCXsZ",
	litecoin: "recspdjMGOX3Ben8J",
	"staked-ether": "recOqJZjftaUpnZ7a",
	cardano: "rec7h1q6omN3yfhPC",
	"shiba-inu": "rec6fGqCYbhGxFQPX",
	bitcoin: "rec8OrdJihFHsKrvF",
	"usd-coin": "recbgyvhiWaYztBwg",
	dogecoin: "rec7Boapkdn6brT3n",
	ethereum: "recR07IqTePljRiY1",
	"avalanche-2": "rec8sBdNgTtJWRvvl",
	tether: "recIjrbOyE54KYXee",
	"matic-network": "rec47IJtDrwByW53D",
	"bitcoin-cash": "rechiQjjMUHnQU0rp",
	polkadot: "rech1dMuixnD989qZ",
	solana: "rec7aiqS7GdBLQjob",
	ripple: "recvQzeJFuBQzah6b",
	uniswap: "recdbk1G1rjQhqABd",
	binancecoin: "recUEZcL5KRtcqb1z",
	"the-open-network": "recbpCaY7N5LmFzyy",
	"wrapped-bitcoin": "recHJqXowJMdRX3ch",
};

const getTop20 = async () => {
	try {
		const response = await axios.get(
			"https://api.coingecko.com/api/v3/coins/markets",
			{
				params: {
					vs_currency: "usd",
					order: "market_cap_desc",
					per_page: 20,
					page: 1,
				},
			}
		);
		await response.data.map(async (coin) => {
			if (!coinIds[coin.id]) {
				base("Coins").create(
					[
						{
							fields: {
								name: coin.name,
								symbol: coin.symbol,
								current_price: coin.current_price,
								market_cap: coin.market_cap,
							},
						},
					],
					function (err, records) {
						if (err) {
							console.error(err);
							return;
						}
						records.forEach(function (record) {
							// console.log(coin.id)
							coinIds[coin.id] = record.getId();
							console.log(coinIds);
						});
					}
				);
			} else {
				base("Coins").update(
					[
						{
							id: coinIds[coin.id],
							fields: {
								name: coin.name,
								symbol: coin.symbol,
								current_price: coin.current_price,
								market_cap: coin.market_cap,
							},
						},
					],
					function (err, records) {
						if (err) {
							console.error(err);
							return;
						}
						records.forEach(function (record) {
							console.log(record.get("name"));
						});
					}
				);
			}
		});
		console.log(coinIds);
	} catch (err) {
		console.log(err);
	}
};

// getTop20();

// const updateTop20 = async () => {
// 	const coins = await getTop20();
// 	// await deleteAll();
// 	coins.forEach(async (coin) => {
// 		await base("Coins").create(
// 			[
// 				{
// 					fields: {
// 						name: coin.name,
// 						symbol: coin.symbol,
// 						current_price: coin.current_price,
// 						market_cap: coin.market_cap,
// 					},
// 				},
// 			],
// 			function (err, records) {
// 				if (err) {
// 					console.error(err);
// 					return;
// 				}
// 				records.forEach(function (record) {
// 					console.log(record.get("Name"));
// 				});
// 			}
// 		);
// 	});
// };

const getNewPrices = async () => {
	// This response will be replaced by our airTable databse top 20 records but fetching every 1 minute
	const response = await axios.get(
		"https://api.coingecko.com/api/v3/simple/price",
		{
			params: {
				ids: Object.keys(coinIds).join(","),
				vs_currencies: "usd",
			},
		}
	);
	const price = response.data;
	Object.keys(price).map(async (coinID) => {
		await base("Coins").update(
			[
				{
					id: coinIds[coinID],
					fields: {
						current_price: price[coinID].usd,
					},
				},
			],
			function (err, records) {
				if (err) {
					console.error(err);
					return;
				}
				records.forEach(function (record) {
					console.log(record.get("name"));
				});
			}
		);
	});
};

// Runs every 20 minute
cron.schedule("*/20 * * * *", async () => {
	try {
    console.log("fetched top 20")
		getTop20();
	} catch (err) {
		console.log(err);
	}
});

// Runs every Minute
cron.schedule("*/1 * * * *", async () => {
	try {
    console.log("Price updated for")
		getNewPrices();
	} catch (err) {
		console.log(err);
	}
});


app.get("/coins",async (req, res) => {
  console.log("/get/coins")
  const data = {}
	await base("Coins")
		.select({
			// Selecting the first 3 records in Grid view:
			maxRecords: 20,
			view: "Grid view",
		})
		.eachPage(function page(records, fetchNextPage) {
			// This function (`page`) will get called for each page of records.

			records.forEach(function (record) {
				data[record.get('symbol')] = {
          price: record.get("current_price")
        }
			});
		});
  res.json(data);
});



const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
