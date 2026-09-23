package com.email.writer;

import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@AllArgsConstructor
public class AuthController {

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal OAuth2User oauth2User) {

        if (oauth2User == null) {
            return ResponseEntity.status(401).body(
                    Map.of("authenticated", false)
            );
        }

        /*
         * Built explicitly as a Map<String, Object> instead of
         * Map.of(...). Mixing a boolean literal with generic
         * oauth2User.getAttribute(...) calls inside Map.of(...)
         * makes javac infer the generic return type as Boolean
         * (to unify with the "true" literal), which inserts an
         * invalid checkcast to Boolean around the String email
         * and name values -> ClassCastException at runtime.
         */
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", true);
        body.put("email", oauth2User.getAttribute("email"));
        body.put("name", oauth2User.getAttribute("name"));

        return ResponseEntity.ok(body);
    }
}