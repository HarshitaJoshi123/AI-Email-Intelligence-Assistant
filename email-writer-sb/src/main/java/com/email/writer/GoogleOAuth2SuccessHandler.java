package com.email.writer;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleOAuth2SuccessHandler
        implements AuthenticationSuccessHandler {

    private final UserService userService;

    public GoogleOAuth2SuccessHandler(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        if (authentication instanceof OAuth2AuthenticationToken oauthToken) {

            OAuth2User oauth2User = oauthToken.getPrincipal();

            userService.getOrCreateUser(oauth2User);
        }

        response.sendRedirect("https://ai-email-intelligence-assistant.vercel.app/");
    }
}