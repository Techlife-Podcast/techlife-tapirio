const request = require('supertest');
const app = require('../app');
const router = require('../routes/router');

const Project = require('../scripts/app.functions');

let posts;
let tags;
let getPostsByTag;
describe('blog posts', () => {
    beforeAll(async () => {
        const blog = new Project(router.blogPath);
        const promise = new Promise((resolve) => {
            blog.init().then(() => {
                posts = blog.posts;
                tags = blog.tags;
                getPostsByTag = blog.getPostsByTag;
                resolve();
            });    
        });
        return promise;
    })
    it('contains all tags', async () => {
        const response = await request(app)
            .get('/tags');
        for (let i = 0; i < tags.length; i++) {
            expect(response.text).toContain(tags[i]);
        }
        expect(response.statusCode).toBe(200);
    })
    it('opens posts by tag', async () => {
        const response = await request(app)
            .get('/tags/' + tags[0]);
        const postsByTag = getPostsByTag(tags[0])
        for (let i = 0; i < postsByTag.length; i++) {
            expect(response.text).toContain(postsByTag[i].slug);
        }
        expect(response.statusCode).toBe(200);
    })
})