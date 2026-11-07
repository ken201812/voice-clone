> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Model

> Delete an existing model



## OpenAPI

````yaml delete /model/{id}
openapi: 3.1.0
info:
  title: FishAudio OpenAPI
  version: '1'
servers:
  - description: Fish Audio API
    url: https://api.fish.audio
security: []
tags: []
paths:
  /model/{id}:
    delete:
      tags:
        - Model
      summary: Delete Model
      parameters:
        - in: path
          name: id
          description: ''
          required: true
          schema:
            title: Id
            type: string
          deprecated: false
      responses:
        '200':
          description: Request fulfilled, document follows
          headers: {}
        '401':
          description: No permission -- see authorization schemes
          headers: {}
          content:
            application/json:
              schema:
                properties:
                  status:
                    title: Status
                    type: integer
                  message:
                    title: Message
                    type: string
                  reason:
                    anyOf:
                      - type: string
                      - type: 'null'
                    default: null
                    title: Reason
                required:
                  - status
                  - message
                type: object
        '503':
          description: The server cannot process the request due to a high load
          headers: {}
          content:
            application/json:
              schema:
                properties:
                  status:
                    title: Status
                    type: integer
                  message:
                    title: Message
                    type: string
                  reason:
                    anyOf:
                      - type: string
                      - type: 'null'
                    default: null
                    title: Reason
                required:
                  - status
                  - message
                type: object
      security:
        - BearerAuth: []
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer

````

This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.