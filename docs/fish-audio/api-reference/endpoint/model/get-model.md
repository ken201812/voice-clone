> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Model

> Get details of a specific model



## OpenAPI

````yaml get /model/{id}
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
    get:
      tags:
        - Model
      summary: Get Model
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
          content:
            application/json:
              schema:
                properties:
                  _id:
                    title: Id
                    type: string
                  type:
                    enum:
                      - svc
                      - tts
                    title: Type
                    type: string
                  title:
                    title: Title
                    type: string
                  description:
                    default: ''
                    title: Description
                    type: string
                  cover_image:
                    default: ''
                    title: Cover Image
                    type: string
                  train_mode:
                    default: full
                    enum:
                      - fast
                      - full
                    title: Train Mode
                    type: string
                  state:
                    enum:
                      - created
                      - training
                      - trained
                      - failed
                    title: State
                    type: string
                  tags:
                    items:
                      type: string
                    title: Tags
                    type: array
                  samples:
                    default: []
                    items:
                      $ref: '#/components/schemas/SampleEntity'
                    title: Samples
                    type: array
                  created_at:
                    format: date-time
                    title: Created At
                    type: string
                  updated_at:
                    format: date-time
                    title: Updated At
                    type: string
                  languages:
                    default: []
                    items:
                      type: string
                    title: Languages
                    type: array
                  visibility:
                    enum:
                      - public
                      - unlist
                      - private
                    title: Visibility
                    type: string
                  lock_visibility:
                    default: false
                    title: Lock Visibility
                    type: boolean
                  dmca_taken_down:
                    anyOf:
                      - type: boolean
                      - type: 'null'
                    default: false
                    title: Dmca Taken Down
                  takedown_category:
                    anyOf:
                      - enum:
                          - dmca
                          - policy
                        type: string
                      - type: 'null'
                    default: null
                    title: Takedown Category
                  default_text:
                    default: ''
                    title: Default Text
                    type: string
                  source:
                    anyOf:
                      - type: string
                      - type: 'null'
                    default: null
                    title: Source
                  licensed:
                    default: false
                    title: Licensed
                    type: boolean
                  pvc_release_state:
                    anyOf:
                      - enum:
                          - released
                          - retiring
                        type: string
                      - type: 'null'
                    default: null
                    title: Pvc Release State
                  pvc_notice_period_months:
                    anyOf:
                      - type: integer
                      - type: 'null'
                    default: null
                    title: Pvc Notice Period Months
                  pvc_released_at:
                    anyOf:
                      - format: date-time
                        type: string
                      - type: 'null'
                    default: null
                    title: Pvc Released At
                  pvc_retire_requested_at:
                    anyOf:
                      - format: date-time
                        type: string
                      - type: 'null'
                    default: null
                    title: Pvc Retire Requested At
                  pvc_retire_effective_at:
                    anyOf:
                      - format: date-time
                        type: string
                      - type: 'null'
                    default: null
                    title: Pvc Retire Effective At
                  quality:
                    anyOf:
                      - $ref: '#/components/schemas/ModelQualityEntity'
                      - type: 'null'
                    default: null
                  like_count:
                    title: Like Count
                    type: integer
                  mark_count:
                    title: Mark Count
                    type: integer
                  shared_count:
                    title: Shared Count
                    type: integer
                  task_count:
                    title: Task Count
                    type: integer
                  unliked:
                    default: false
                    title: Unliked
                    type: boolean
                  liked:
                    default: false
                    title: Liked
                    type: boolean
                  marked:
                    default: false
                    title: Marked
                    type: boolean
                  author:
                    $ref: '#/components/schemas/AuthorEntity'
                required:
                  - _id
                  - type
                  - title
                  - state
                  - tags
                  - created_at
                  - updated_at
                  - visibility
                  - like_count
                  - mark_count
                  - shared_count
                  - task_count
                  - author
                type: object
        '403':
          description: Request forbidden -- authorization will not help
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
        '404':
          description: Nothing matches the given URI
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
  schemas:
    SampleEntity:
      properties:
        title:
          title: Title
          type: string
        text:
          title: Text
          type: string
        task_id:
          title: Task Id
          type: string
        audio:
          title: Audio
          type: string
      required:
        - title
        - text
        - task_id
        - audio
      title: SampleEntity
      type: object
    ModelQualityEntity:
      properties:
        audios:
          items:
            $ref: '#/components/schemas/ModelAudioQualityEntity'
          title: Audios
          type: array
        created_at:
          format: date-time
          title: Created At
          type: string
        updated_at:
          format: date-time
          title: Updated At
          type: string
      required:
        - created_at
        - updated_at
      title: ModelQualityEntity
      type: object
    AuthorEntity:
      properties:
        _id:
          title: Id
          type: string
        nickname:
          title: Nickname
          type: string
        avatar:
          title: Avatar
          type: string
      required:
        - _id
        - nickname
        - avatar
      title: AuthorEntity
      type: object
    ModelAudioQualityEntity:
      properties:
        filename:
          title: Filename
          type: string
        duration_ms:
          title: Duration Ms
          type: number
        language:
          default: unknown
          title: Language
          type: string
        quality:
          additionalProperties:
            type: number
          title: Quality
          type: object
        quality_passed:
          default: false
          title: Quality Passed
          type: boolean
        quality_reason:
          default: ''
          title: Quality Reason
          type: string
      required:
        - filename
        - duration_ms
      title: ModelAudioQualityEntity
      type: object
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer

````

This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.