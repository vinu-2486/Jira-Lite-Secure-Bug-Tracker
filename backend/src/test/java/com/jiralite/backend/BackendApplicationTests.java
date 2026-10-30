package com.jiralite.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
@ActiveProfiles("isolated-test")
class BackendApplicationTests {

	@Autowired
	private JdbcTemplate jdbc;

	@DynamicPropertySource
	static void isolatedDatabase(DynamicPropertyRegistry registry) {
		IsolatedDatabaseTestSupport.registerProperties(registry);
	}

	@Test
	void contextLoads() {
	}

	@Test
	void databaseIsTheDedicatedTestSchema() {
		String actualSchema = jdbc.queryForObject("SELECT DATABASE()", String.class);
		org.assertj.core.api.Assertions.assertThat(actualSchema)
				.isEqualTo(IsolatedDatabaseTestSupport.expectedSchema());
	}

}
