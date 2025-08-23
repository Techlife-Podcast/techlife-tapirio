const request = require('supertest');
const app = require('../app');
const router = require('../routes/router');
const Compiler = require('../scripts/compiler')
const path = router.blogPath;

let meta;
describe('blog posts', () => {
    beforeAll(async () => {
        const compiler = new Compiler(path);
        meta = await compiler.listMeta();
    })
    it('contains post image in each post', async () => {
        for (let i = 0; i < meta.length; i++) {
            const response = await request(app)
                .get(`/blog/${meta[i].slug}`);
            expect(response.text).toContain(meta[i].image);
            expect(response.statusCode).toBe(200);
        }
    })

    it('contains all post titles on /blog', async () => {
        const response = await request(app)
            .get('/blog');
        for (let i = 0; i < meta.length; i++) {
            expect(response.text).toContain(meta[i].image);
        }
        expect(response.statusCode).toBe(200);
    })

    it('contains post title in each post', async () => {
        for (let i = 0; i < meta.length; i++) {
            const response = await request(app)
                .get(`/blog/${meta[i].slug}`);
            expect(response.text).toContain(meta[i].title);
            expect(response.statusCode).toBe(200);
        }
    })
})