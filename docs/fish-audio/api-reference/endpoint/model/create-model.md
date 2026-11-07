> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Model

> Create a new voice model

> [!WARNING]
>
> Since this endpoint uploads files, use `multipart/form-data` for regular REST
> requests. Let your HTTP client set the multipart `Content-Type` boundary
> automatically.


## OpenAPI

````yaml post /model
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
  /model:
    post:
      tags:
        - Model
      summary: Create Model for Users via API
      requestBody:
        required: true
        content:
          application/json:
            schema:
              properties:
                visibility:
                  default: private
                  description: >-
                    Model visibility. Public requests are downgraded to private;
                    use the web publish flow to publish publicly. Unlist allows
                    anyone with the link to access, while private is visible
                    only to the creator.
                  enum:
                    - public
                    - unlist
                    - private
                  title: Visibility
                  type: string
                type:
                  const: tts
                  description: Model type, tts is for text to speech
                  title: Type
                  type: string
                title:
                  description: Model title or name
                  title: Title
                  type: string
                description:
                  anyOf:
                    - type: string
                    - type: 'null'
                  default: null
                  description: Model description
                  title: Description
                cover_image:
                  anyOf:
                    - format: binary
                      type: string
                    - type: 'null'
                  default: null
                  description: Model cover image, this is required if the model is public
                  title: Cover Image
                train_mode:
                  const: fast
                  description: >-
                    Model train mode, for TTS model, fast means model instantly
                    available after creation
                  title: Train Mode
                  type: string
                voices:
                  anyOf:
                    - items:
                        format: binary
                        type: string
                      maxItems: 20
                      minItems: 1
                      type: array
                    - format: binary
                      type: string
                  description: Upload voices files that will be used to tune the model
                  title: Voices
                texts:
                  anyOf:
                    - items:
                        type: string
                      maxItems: 20
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Texts corresponding to the voices, if unspecified, ASR will
                    be performed on the voices
                  title: Texts
                voice_design_signatures:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Signatures from /v1/voice-design candidates, one per voice
                    in the same order. When every uploaded voice verifies, the
                    model is stamped source=voice_design; an invalid signature
                    rejects the request.
                  title: Voice Design Signatures
                tags:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  description: Model tags
                  title: Tags
                enhance_audio_quality:
                  default: true
                  description: Enhance audio quality
                  title: Enhance Audio Quality
                  type: boolean
                generate_sample:
                  default: false
                  description: Generate default text
                  title: Generate Sample
                  type: boolean
              required:
                - type
                - title
                - train_mode
                - voices
              type: object
          application/x-www-form-urlencoded:
            schema:
              properties:
                visibility:
                  default: private
                  description: >-
                    Model visibility. Public requests are downgraded to private;
                    use the web publish flow to publish publicly. Unlist allows
                    anyone with the link to access, while private is visible
                    only to the creator.
                  enum:
                    - public
                    - unlist
                    - private
                  title: Visibility
                  type: string
                type:
                  const: tts
                  description: Model type, tts is for text to speech
                  title: Type
                  type: string
                title:
                  description: Model title or name
                  title: Title
                  type: string
                description:
                  anyOf:
                    - type: string
                    - type: 'null'
                  default: null
                  description: Model description
                  title: Description
                cover_image:
                  anyOf:
                    - format: binary
                      type: string
                    - type: 'null'
                  default: null
                  description: Model cover image, this is required if the model is public
                  title: Cover Image
                train_mode:
                  const: fast
                  description: >-
                    Model train mode, for TTS model, fast means model instantly
                    available after creation
                  title: Train Mode
                  type: string
                voices:
                  anyOf:
                    - items:
                        format: binary
                        type: string
                      maxItems: 20
                      minItems: 1
                      type: array
                    - format: binary
                      type: string
                  description: Upload voices files that will be used to tune the model
                  title: Voices
                texts:
                  anyOf:
                    - items:
                        type: string
                      maxItems: 20
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Texts corresponding to the voices, if unspecified, ASR will
                    be performed on the voices
                  title: Texts
                voice_design_signatures:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Signatures from /v1/voice-design candidates, one per voice
                    in the same order. When every uploaded voice verifies, the
                    model is stamped source=voice_design; an invalid signature
                    rejects the request.
                  title: Voice Design Signatures
                tags:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  description: Model tags
                  title: Tags
                enhance_audio_quality:
                  default: true
                  description: Enhance audio quality
                  title: Enhance Audio Quality
                  type: boolean
                generate_sample:
                  default: false
                  description: Generate default text
                  title: Generate Sample
                  type: boolean
              required:
                - type
                - title
                - train_mode
                - voices
              type: object
          multipart/form-data:
            schema:
              properties:
                visibility:
                  default: private
                  description: >-
                    Model visibility. Public requests are downgraded to private;
                    use the web publish flow to publish publicly. Unlist allows
                    anyone with the link to access, while private is visible
                    only to the creator.
                  enum:
                    - public
                    - unlist
                    - private
                  title: Visibility
                  type: string
                type:
                  const: tts
                  description: Model type, tts is for text to speech
                  title: Type
                  type: string
                title:
                  description: Model title or name
                  title: Title
                  type: string
                description:
                  anyOf:
                    - type: string
                    - type: 'null'
                  default: null
                  description: Model description
                  title: Description
                cover_image:
                  anyOf:
                    - format: binary
                      type: string
                    - type: 'null'
                  default: null
                  description: Model cover image, this is required if the model is public
                  title: Cover Image
                train_mode:
                  const: fast
                  description: >-
                    Model train mode, for TTS model, fast means model instantly
                    available after creation
                  title: Train Mode
                  type: string
                voices:
                  anyOf:
                    - items:
                        format: binary
                        type: string
                      maxItems: 20
                      minItems: 1
                      type: array
                    - format: binary
                      type: string
                  description: Upload voices files that will be used to tune the model
                  title: Voices
                texts:
                  anyOf:
                    - items:
                        type: string
                      maxItems: 20
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Texts corresponding to the voices, if unspecified, ASR will
                    be performed on the voices
                  title: Texts
                voice_design_signatures:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Signatures from /v1/voice-design candidates, one per voice
                    in the same order. When every uploaded voice verifies, the
                    model is stamped source=voice_design; an invalid signature
                    rejects the request.
                  title: Voice Design Signatures
                tags:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  description: Model tags
                  title: Tags
                enhance_audio_quality:
                  default: true
                  description: Enhance audio quality
                  title: Enhance Audio Quality
                  type: boolean
                generate_sample:
                  default: false
                  description: Generate default text
                  title: Generate Sample
                  type: boolean
              required:
                - type
                - title
                - train_mode
                - voices
              type: object
          application/msgpack:
            schema:
              properties:
                visibility:
                  default: private
                  description: >-
                    Model visibility. Public requests are downgraded to private;
                    use the web publish flow to publish publicly. Unlist allows
                    anyone with the link to access, while private is visible
                    only to the creator.
                  enum:
                    - public
                    - unlist
                    - private
                  title: Visibility
                  type: string
                type:
                  const: tts
                  description: Model type, tts is for text to speech
                  title: Type
                  type: string
                title:
                  description: Model title or name
                  title: Title
                  type: string
                description:
                  anyOf:
                    - type: string
                    - type: 'null'
                  default: null
                  description: Model description
                  title: Description
                cover_image:
                  anyOf:
                    - format: binary
                      type: string
                    - type: 'null'
                  default: null
                  description: Model cover image, this is required if the model is public
                  title: Cover Image
                train_mode:
                  const: fast
                  description: >-
                    Model train mode, for TTS model, fast means model instantly
                    available after creation
                  title: Train Mode
                  type: string
                voices:
                  anyOf:
                    - items:
                        format: binary
                        type: string
                      maxItems: 20
                      minItems: 1
                      type: array
                    - format: binary
                      type: string
                  description: Upload voices files that will be used to tune the model
                  title: Voices
                texts:
                  anyOf:
                    - items:
                        type: string
                      maxItems: 20
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Texts corresponding to the voices, if unspecified, ASR will
                    be performed on the voices
                  title: Texts
                voice_design_signatures:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  default: null
                  description: >-
                    Signatures from /v1/voice-design candidates, one per voice
                    in the same order. When every uploaded voice verifies, the
                    model is stamped source=voice_design; an invalid signature
                    rejects the request.
                  title: Voice Design Signatures
                tags:
                  anyOf:
                    - items:
                        type: string
                      type: array
                    - type: string
                    - type: 'null'
                  description: Model tags
                  title: Tags
                enhance_audio_quality:
                  default: true
                  description: Enhance audio quality
                  title: Enhance Audio Quality
                  type: boolean
                generate_sample:
                  default: false
                  description: Generate default text
                  title: Generate Sample
                  type: boolean
              required:
                - type
                - title
                - train_mode
                - voices
              type: object
      responses:
        '201':
          description: Document created, URL follows
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