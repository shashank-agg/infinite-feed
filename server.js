const express = require('express');
const mongoose = require('mongoose');
const requestPromise = require('request-promise');
const parseString = require('xml2js').parseString;


let aggregateFeed = []
let newestFeedItem;
const PAGE_SIZE = 10;
const POLLING_PERIOD = 5000; // in ms
const MONGO_URL = 'mongodb://localhost:27017';
/*
###################################################
On service bootup:
1. Connect to DB.
2. Create index on pubDate since we will query on that
3. Start the polling for RSS feeds.
###################################################
*/
mongoose.connect(MONGO_URL + '/rssfeedDB', {useNewUrlParser: true});
var db = mongoose.connection;
const rssItemSchema = new mongoose.Schema({
    title: String,
    link: String,
    pubDate: Date,
    description: String
});
rssItemSchema.index({ pubDate: -1 });
const rssItemModel = mongoose.model('rssItem', rssItemSchema, 'rssItemsCollection');


db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Connected to DB");
    rssItemModel.find({}, null, { sort: { pubDate: -1 }, limit: 1 }, (err, result) => {
        if (result.length > 0) {
            console.log("Found newest entry in DB with date", result[0].pubDate);
            newestFeedItem = result[0];
        }
    })
    setInterval(updateLocalFeedStore, POLLING_PERIOD)
});


/*
###################################################
On every poll:
1. Fetch news items from all the RSS urls .
2. Flatten out all the news items into one array (mergedRss)
3. Remove items older than the newest entry in our DB
4. Sort the items in chronological order
4. Save the items to DB
###################################################
*/
function updateLocalFeedStore() {
    const rssUrls = [
                        'https://www.theguardian.com/world/rss',
                        // 'http://lorem-rss.herokuapp.com/feed?unit=second',
                        'https://www.tagesspiegel.de/contentexport/feed/home',
                        // 'http://rss.cnn.com/rss/cnn_topstories.rss',
                        'http://rssfeeds.usatoday.com/usatoday-NewsTopStories',
                        'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/world/rss.xml'
                    ];
    const allPromises = rssUrls.map((url) => getFeed(url))
    console.log("Firing RSS requests");
    Promise.all(allPromises).then((rssItems) => {
        console.log("Done fetching all the urls");        
        let mergedRss = [].concat.apply([], rssItems);
        mergedRss.forEach((item) => { item.pubDate = new Date(item.pubDate[0]) }) // In the xml, pubDate is an array of string. Converting it to Date.
        if (newestFeedItem) {
            mergedRss = mergedRss.filter((item) => item.pubDate > newestFeedItem.pubDate) //Remove items older than the newest item in our DB
        };
        if (mergedRss.length === 0) {console.log("No new items to add.\n\n"); return}; // No new news items to add to DB
        mergedRss.sort((item1, item2) => item2.pubDate - item1.pubDate); //Sort by pubDate. At index  0 => newest item
        mergedRss.forEach((item) => {
            let itemToInsert = new rssItemModel({ title: item.title[0], link: item.link[0], pubDate: item.pubDate, description: item.description[0] });
            itemToInsert.save()
        })
        newestFeedItem = mergedRss[0];
        console.log(`Added ${mergedRss.length} items to DB\n\n`);
    });
}

/*
###################################################
Actual function which fires the GET to the xml urls, and converts it to json
###################################################
*/
function getFeed(url) {
    return requestPromise(url)
        .then((xml) => {
            return new Promise((resolve, reject) => {
                parseString(xml, function (err, xmltojson) {
                    if (err) reject(err);
                    resolve(xmltojson.rss.channel[0].item);
                });
            });
        })
        .catch((err) => console.log(err));
}


/*
###################################################
Request handler for /feed api
###################################################
*/
function feedHandler(req, res) {
    const pageNumber = req.query.page || 0;
    rssItemModel.find({}).sort({ pubDate: -1 }).skip(pageNumber * PAGE_SIZE).limit(PAGE_SIZE).then((items) => {
        res.send(items);
    })
}

const app = express()
const port = 3000
app.use(express.static('public'))

app.get('/feed', feedHandler)
app.listen(port, () => console.log(`Server listening on port ${port}`))