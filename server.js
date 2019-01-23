const express = require('express');
const requestPromise = require('request-promise');
const parseString = require('xml2js').parseString;

const app = express()
const port = 3000
let aggregateFeed = []

function pp(item) {
    console.log("###", item.pubDate.toString(), "|||||", item.guid[0].substring(0, 40))
}

function updateLocalFeedStore() {
    const rssUrls = ['https://www.theguardian.com/world/rss',
                'https://www.tagesspiegel.de/contentexport/feed/home'];
    const allPromises = rssUrls.map((url) => getFeed(url))       
    Promise.all(allPromises).then((rssItems) => {
        let mergedRss = [].concat.apply([], rssItems);
        mergedRss.forEach((item) => {item.pubDate = new Date(item.pubDate[0])})
        if (aggregateFeed.length > 0) {
            console.log("Removing old items");
            const latestFeedInStore = aggregateFeed[0];
            console.log("aggregateFeed[0]:");
            pp(aggregateFeed[0]);
            mergedRss = mergedRss.filter((item) => item.pubDate > latestFeedInStore.pubDate) //Remove items older than the newest item in our store
            console.log("Passed: ", mergedRss)
        };
        mergedRss.sort((item1, item2) => item2.pubDate - item1.pubDate); //Sort by pubDate. At index  0 => newest item
        aggregateFeed = mergedRss.concat(aggregateFeed); // add the new items to the beginning of the array
        console.log(`\n\n\nAdding ${mergedRss.length} items to aggregateFeed`);
        // aggregateFeed.forEach(item => pp(item));
        // console.log(aggregateFeed[0], aggregateFeed[1], aggregateFeed[2]);
        // mergedRss.forEach(rss => console.log(rss.pubDate))
    });
    // getFeed('https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/world/rss.xml')
    //     .then((abc) => console.log("xczczxc", abc))
}

setInterval(updateLocalFeedStore, 5000)
// updateLocalFeedStore();

function getFeed(url) {
    return requestPromise(url)
        .then((xml) => {
            return new Promise((resolve, reject) => {
                parseString(xml, function(err, xmltojson) {
                    if (err) reject(err);
                    resolve(xmltojson.rss.channel[0].item);
                });
            });
        })
        .catch((err) => console.log(err));
}
updateLocalFeedStore();
app.get('/', getFeed)

// app.listen(port, () => console.log(`Example app listening on port ${port}!`))