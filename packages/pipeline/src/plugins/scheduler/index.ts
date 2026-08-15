import fp from "fastify-plugin";
import fastifySchedule from '@fastify/schedule';

export default fp(async (app) => {
  app.register(fastifySchedule);
}, {
  name: '@reposcope/scheduler'
});
