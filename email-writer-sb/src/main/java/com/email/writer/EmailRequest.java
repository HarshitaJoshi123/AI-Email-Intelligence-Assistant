//POJO stands for Plain Old Java Object. It is a simple Java class used to represent and hold data. It usually contains fields along with their getters and setters, and it does not need to extend or implement any special class or interface.
//Here we will define the request structure--it defines how the request will come
package com.email.writer;

import lombok.Data;

@Data
public class EmailRequest {
    private String emailContent;
    private String tone;   //tone to define which type of reply u want for the above email content
}
