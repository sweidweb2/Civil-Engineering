npm run db:migrate # apply pending migrations
npm run db:seed # seed

# Same gates as CI quality job (also runs on git pre-push)

npm run ci:local

npm run test:unit --prefix backend
npm run test:integration --prefix backend
npm run test:e2e --prefix backend

npm run test:unit --prefix civil-web
npm run test:e2e --prefix civil-web
