// Unit tests never touch a real database; give env validation a syntactically valid URL.
process.env.DATABASE_URL = "postgresql://unit:unit@localhost:5432/unit_tests_do_not_connect";
process.env.LOG_LEVEL = "silent";
process.env.BETTER_AUTH_SECRET = "unit-test-secret-unit-test-secret-000";
