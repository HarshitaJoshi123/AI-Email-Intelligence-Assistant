package com.email.writer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EmailWriterSbApplication {

	public static void main(String[] args) {

		SpringApplication.run(
				EmailWriterSbApplication.class,
				args
		);
	}
}