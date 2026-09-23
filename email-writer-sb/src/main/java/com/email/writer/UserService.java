package com.email.writer;

import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getOrCreateUser(OAuth2User oauth2User) {

        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");

        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    "Google account email could not be retrieved"
            );
        }

        return userRepository.findByEmail(email)
                .orElseGet(() -> {

                    User user = new User();

                    user.setEmail(email);
                    user.setName(name);
                    user.setCreatedAt(LocalDateTime.now());

                    return userRepository.save(user);
                });
    }

    /*
     * Lets a logged-in user connect (or disconnect) their own
     * Telegram chat id, instead of every user's reminders going
     * to one hardcoded chat.
     *
     * chatId may be blank/null to clear it. enabled is a separate
     * flag so a user can pause notifications without losing the
     * chat id they'd already saved.
     */
    public User updateTelegramSettings(
            User user,
            String chatId,
            boolean enabled) {

        String normalizedChatId =
                (chatId == null || chatId.isBlank())
                        ? null
                        : chatId.trim();

        user.setTelegramChatId(normalizedChatId);

        // Can't be "enabled" with no chat id to send to.
        user.setTelegramNotificationsEnabled(
                enabled && normalizedChatId != null
        );

        return userRepository.save(user);
    }
}