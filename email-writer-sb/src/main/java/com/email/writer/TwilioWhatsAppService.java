package com.email.writer;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TwilioWhatsAppService {

    private final String fromNumber;
    private final String toNumber;

    public TwilioWhatsAppService(
            @Value("${twilio.account.sid}") String accountSid,
            @Value("${twilio.auth.token}") String authToken,
            @Value("${twilio.whatsapp.from}") String fromNumber,
            @Value("${twilio.whatsapp.to}") String toNumber) {

        this.fromNumber = fromNumber;
        this.toNumber = toNumber;

        Twilio.init(accountSid, authToken);
    }

    public String sendWhatsAppMessage(String messageBody) {

        Message message = Message.creator(
                        new PhoneNumber(toNumber),
                        new PhoneNumber(fromNumber),
                        messageBody
                )
                .create();

        return message.getSid();
    }
}