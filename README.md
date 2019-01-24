1. `git clone https://github.com/shashank-agg/infinite-feed.git`
2. `cd infinite-feed`
3. `npm install`
4. `node server.js`
5. Assumes MongoDB is running at `mongodb://localhost:27017`. If not change line 11 in server.js to your `mongodb://username:password@host:port`.
 

The UI is at `http://localhost:3000/`
The feed api is at `http://localhost:3000/feed?page=0`