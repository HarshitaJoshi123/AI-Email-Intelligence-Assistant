package com.email.writer;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class SecurityConfig {

    private final GoogleOAuth2SuccessHandler googleOAuth2SuccessHandler;

    public SecurityConfig(
            GoogleOAuth2SuccessHandler googleOAuth2SuccessHandler
    ) {
        this.googleOAuth2SuccessHandler = googleOAuth2SuccessHandler;
    }

    /*
     * Google's /userinfo endpoint sometimes returns claims like
     * "email_verified" as a String ("true") instead of a real
     * Boolean, even though the OIDC spec requires Boolean.
     * Spring Security's OidcUserInfo.getEmailVerified() does a
     * strict (Boolean) cast on that claim, which throws a
     * ClassCastException right after login succeeds.
     *
     * This wraps the default OidcUserService and normalizes any
     * such claims to real Booleans before Spring touches them.
     */
    @Bean
    public OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService() {

        OidcUserService delegate = new OidcUserService();

        return userRequest -> {

            OidcUser oidcUser = delegate.loadUser(userRequest);

            Map<String, Object> claims = new HashMap<>(oidcUser.getClaims());

            normalizeBooleanClaim(claims, "email_verified");
            normalizeBooleanClaim(claims, "phone_number_verified");

            OidcUserInfo userInfo = new OidcUserInfo(claims);

            return new DefaultOidcUser(
                    oidcUser.getAuthorities(),
                    oidcUser.getIdToken(),
                    userInfo
            );
        };
    }

    private void normalizeBooleanClaim(
            Map<String, Object> claims,
            String claimName
    ) {
        Object value = claims.get(claimName);

        if (value instanceof String stringValue) {
            claims.put(claimName, Boolean.parseBoolean(stringValue));
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(cors -> {})

            .authorizeHttpRequests(auth -> auth

                // Allow CORS preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // OAuth2 endpoints
                .requestMatchers(
                        "/oauth2/**",
                        "/login/**",
                        "/api/auth/me"
                ).permitAll()

                // Email APIs require authentication
                .requestMatchers("/api/email/**")
                .authenticated()

                // Everything else
                .anyRequest()
                .authenticated()
            )

            .oauth2Login(oauth -> oauth
                    .userInfoEndpoint(userInfo -> userInfo.oidcUserService(oidcUserService()))
                    .successHandler(googleOAuth2SuccessHandler)
            )

            .logout(logout -> logout
                    .logoutUrl("/logout")
                    .logoutSuccessUrl("https://ai-email-intelligence-assistant.vercel.app/")
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID")
                    .permitAll()
            );

        return http.build();
    }
}