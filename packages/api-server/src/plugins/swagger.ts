import fp from "fastify-plugin";
import swagger from "@fastify/swagger";

export default fp(async (fastify) => {
    fastify.register(swagger, {
        swagger: {
            info: {
                title: 'Reposcope API',
                description: 'Reposcope API',
                version: '0.1.0'
            },
        }
    });
}, {
    name: '@reposcope/swagger',
    dependencies: [
        '@fastify/env'
    ],
});