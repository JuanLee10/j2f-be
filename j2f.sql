\echo 'Delete and recreate j2f db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE j2f;
CREATE DATABASE j2f;
\connect j2f

\i j2f-schema.sql
\i j2f-seed.sql

\echo 'Delete and recreate j2f_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE j2f_test;
CREATE DATABASE j2f_test;
\connect j2f_test

\i j2f-schema.sql
