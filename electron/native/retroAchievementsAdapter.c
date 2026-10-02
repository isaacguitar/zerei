#include "rc_client.h"
#include "rc_libretro.h"

#include <stdlib.h>

#define ZEREI_EXPORT __declspec(dllexport)

enum {
  ZEREI_RA_EVENT_LOGIN = 100,
  ZEREI_RA_EVENT_GAME_LOADED = 101
};

typedef void (RC_CCONV *zerei_http_request_callback)(const char*, const char*, const char*, void*);
typedef void (RC_CCONV *zerei_event_callback)(int, int, uint32_t, uint32_t, const char*, const char*, const char*, const char*, const char*, const char*);
typedef void (RC_CCONV *zerei_core_memory_callback)(uint32_t, rc_libretro_core_memory_info_t*, void*);

typedef struct zerei_ra_client {
  rc_client_t* client;
  rc_libretro_memory_regions_t memory_regions;
  zerei_http_request_callback http_callback;
  zerei_event_callback event_callback;
  zerei_core_memory_callback core_memory_callback;
  void* callback_userdata;
  uint32_t console_id;
  int memory_initialized;
} zerei_ra_client;

typedef struct zerei_pending_request {
  rc_client_server_callback_t callback;
  void* callback_userdata;
} zerei_pending_request;

static zerei_ra_client* zerei_memory_bridge;

static void zerei_publish(zerei_ra_client* bridge, int type, int result, uint32_t id, uint32_t points,
                          const char* title, const char* description, const char* badge_url,
                          const char* message, const char* username, const char* token) {
  if (bridge && bridge->event_callback) {
    bridge->event_callback(type, result, id, points, title, description, badge_url, message, username, token);
  }
}

static uint32_t RC_CCONV zerei_read_memory(uint32_t address, uint8_t* buffer, uint32_t num_bytes, rc_client_t* client) {
  zerei_ra_client* bridge = (zerei_ra_client*)rc_client_get_userdata(client);
  if (!bridge || !bridge->memory_initialized) return 0;
  return rc_libretro_memory_read(&bridge->memory_regions, address, buffer, num_bytes);
}

static void RC_CCONV zerei_server_call(const rc_api_request_t* request, rc_client_server_callback_t callback,
                                       void* callback_userdata, rc_client_t* client) {
  zerei_ra_client* bridge = (zerei_ra_client*)rc_client_get_userdata(client);
  zerei_pending_request* pending;

  if (!bridge || !bridge->http_callback || !request || !request->url) {
    rc_api_server_response_t response = { 0 };
    response.http_status_code = RC_API_SERVER_RESPONSE_RETRYABLE_CLIENT_ERROR;
    callback(&response, callback_userdata);
    return;
  }

  pending = (zerei_pending_request*)malloc(sizeof(*pending));
  if (!pending) {
    rc_api_server_response_t response = { 0 };
    response.http_status_code = RC_API_SERVER_RESPONSE_RETRYABLE_CLIENT_ERROR;
    callback(&response, callback_userdata);
    return;
  }

  pending->callback = callback;
  pending->callback_userdata = callback_userdata;
  bridge->http_callback(request->url, request->post_data, request->content_type, pending);
}

static void RC_CCONV zerei_event_handler(const rc_client_event_t* event, rc_client_t* client) {
  zerei_ra_client* bridge = (zerei_ra_client*)rc_client_get_userdata(client);
  if (!bridge || !event) return;

  if (event->type == RC_CLIENT_EVENT_ACHIEVEMENT_TRIGGERED && event->achievement) {
    const rc_client_achievement_t* achievement = event->achievement;
    zerei_publish(bridge, (int)event->type, RC_OK, achievement->id, achievement->points,
                  achievement->title, achievement->description, achievement->badge_url,
                  NULL, NULL, NULL);
  } else if (event->type == RC_CLIENT_EVENT_SERVER_ERROR && event->server_error) {
    zerei_publish(bridge, (int)event->type, event->server_error->result,
                  event->server_error->related_id, 0, NULL, NULL, NULL,
                  event->server_error->error_message, NULL, NULL);
  } else {
    zerei_publish(bridge, (int)event->type, RC_OK, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
  }
}

static void RC_CCONV zerei_login_callback(int result, const char* error_message, rc_client_t* client, void* userdata) {
  zerei_ra_client* bridge = (zerei_ra_client*)userdata;
  const rc_client_user_t* user = result == RC_OK ? rc_client_get_user_info(client) : NULL;
  zerei_publish(bridge, ZEREI_RA_EVENT_LOGIN, result, user ? user->score : 0, 0,
                user ? user->display_name : NULL, NULL, NULL, error_message,
                user ? user->username : NULL, user ? user->token : NULL);
}

static void RC_CCONV zerei_game_load_callback(int result, const char* error_message, rc_client_t* client, void* userdata) {
  zerei_ra_client* bridge = (zerei_ra_client*)userdata;
  const rc_client_game_t* game = result == RC_OK ? rc_client_get_game_info(client) : NULL;
  zerei_publish(bridge, ZEREI_RA_EVENT_GAME_LOADED, result, game ? game->id : 0,
                game ? game->console_id : 0, game ? game->title : NULL,
                game ? game->hash : NULL, game ? game->badge_url : NULL,
                error_message, NULL, NULL);
}

static void RC_CCONV zerei_get_core_memory_info(uint32_t id, rc_libretro_core_memory_info_t* info) {
  if (!info) return;
  info->data = NULL;
  info->size = 0;
  if (zerei_memory_bridge && zerei_memory_bridge->core_memory_callback) {
    zerei_memory_bridge->core_memory_callback(id, info, zerei_memory_bridge->callback_userdata);
  }
}

ZEREI_EXPORT void* RC_CCONV zerei_ra_client_create(zerei_http_request_callback http_callback,
                                                   zerei_event_callback event_callback,
                                                   zerei_core_memory_callback core_memory_callback,
                                                   void* callback_userdata) {
  zerei_ra_client* bridge = (zerei_ra_client*)calloc(1, sizeof(*bridge));
  if (!bridge) return NULL;

  bridge->http_callback = http_callback;
  bridge->event_callback = event_callback;
  bridge->core_memory_callback = core_memory_callback;
  bridge->callback_userdata = callback_userdata;
  bridge->client = rc_client_create(zerei_read_memory, zerei_server_call);
  if (!bridge->client) {
    free(bridge);
    return NULL;
  }

  rc_client_set_userdata(bridge->client, bridge);
  zerei_memory_bridge = bridge;
  rc_client_set_event_handler(bridge->client, zerei_event_handler);
  rc_client_set_hardcore_enabled(bridge->client, 0);
  return bridge;
}

ZEREI_EXPORT void RC_CCONV zerei_ra_client_destroy(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge) return;
  if (bridge->client) {
    rc_client_unload_game(bridge->client);
    rc_client_destroy(bridge->client);
  }
  if (bridge->memory_initialized) rc_libretro_memory_destroy(&bridge->memory_regions);
  if (zerei_memory_bridge == bridge) zerei_memory_bridge = NULL;
  free(bridge);
}

ZEREI_EXPORT int RC_CCONV zerei_ra_login_with_password(void* handle, const char* username, const char* password) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client || !username || !password) return 0;
  rc_client_unload_game(bridge->client);
  rc_client_logout(bridge->client);
  return rc_client_begin_login_with_password(bridge->client, username, password, zerei_login_callback, bridge) != NULL;
}

ZEREI_EXPORT int RC_CCONV zerei_ra_login_with_token(void* handle, const char* username, const char* token) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client || !username || !token) return 0;
  rc_client_unload_game(bridge->client);
  rc_client_logout(bridge->client);
  return rc_client_begin_login_with_token(bridge->client, username, token, zerei_login_callback, bridge) != NULL;
}

ZEREI_EXPORT void RC_CCONV zerei_ra_logout(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client) return;
  rc_client_unload_game(bridge->client);
  rc_client_logout(bridge->client);
}

ZEREI_EXPORT int RC_CCONV zerei_ra_set_memory_map(void* handle, const struct retro_memory_map* memory_map, uint32_t console_id) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  rc_libretro_memory_regions_t regions = { 0 };
  int result;
  if (!bridge) return 0;
  if (bridge->memory_initialized) {
    rc_libretro_memory_destroy(&bridge->memory_regions);
    bridge->memory_initialized = 0;
  }
  bridge->console_id = console_id;
  zerei_memory_bridge = bridge;
  result = rc_libretro_memory_init(&regions, memory_map, zerei_get_core_memory_info, console_id);
  if (!result) return 0;
  bridge->memory_regions = regions;
  bridge->memory_initialized = 1;
  return 1;
}

ZEREI_EXPORT int RC_CCONV zerei_ra_load_game(void* handle, uint32_t console_id, const char* file_path) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client || !file_path) return 0;
  bridge->console_id = console_id;
  return rc_client_begin_identify_and_load_game(bridge->client, console_id, file_path,
                                                NULL, 0, zerei_game_load_callback, bridge) != NULL;
}

ZEREI_EXPORT void RC_CCONV zerei_ra_set_hardcore_enabled(void* handle, int enabled) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (bridge && bridge->client) rc_client_set_hardcore_enabled(bridge->client, enabled != 0);
}

ZEREI_EXPORT void RC_CCONV zerei_ra_do_frame(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (bridge && bridge->client) rc_client_do_frame(bridge->client);
}

ZEREI_EXPORT uint32_t RC_CCONV zerei_ra_read_memory(void* handle, uint32_t address, uint8_t* buffer, uint32_t num_bytes) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->memory_initialized || !buffer) return 0;
  return rc_libretro_memory_read(&bridge->memory_regions, address, buffer, num_bytes);
}

ZEREI_EXPORT void RC_CCONV zerei_ra_idle(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (bridge && bridge->client) rc_client_idle(bridge->client);
}

ZEREI_EXPORT void RC_CCONV zerei_ra_reset(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (bridge && bridge->client) rc_client_reset(bridge->client);
}

ZEREI_EXPORT size_t RC_CCONV zerei_ra_progress_size(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  return bridge && bridge->client ? rc_client_progress_size(bridge->client) : 0;
}

ZEREI_EXPORT int RC_CCONV zerei_ra_serialize_progress(void* handle, uint8_t* buffer, size_t buffer_size) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client || !buffer) return RC_INVALID_STATE;
  return rc_client_serialize_progress_sized(bridge->client, buffer, buffer_size);
}

ZEREI_EXPORT int RC_CCONV zerei_ra_deserialize_progress(void* handle, const uint8_t* buffer, size_t buffer_size) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client || !buffer || !buffer_size) return RC_INVALID_STATE;
  return rc_client_deserialize_progress_sized(bridge->client, buffer, buffer_size);
}

ZEREI_EXPORT void RC_CCONV zerei_ra_unload_game(void* handle) {
  zerei_ra_client* bridge = (zerei_ra_client*)handle;
  if (!bridge || !bridge->client) return;
  rc_client_unload_game(bridge->client);
  if (bridge->memory_initialized) {
    rc_libretro_memory_destroy(&bridge->memory_regions);
    bridge->memory_initialized = 0;
  }
}

ZEREI_EXPORT void RC_CCONV zerei_ra_complete_request(void* request_handle, int http_status,
                                                     const char* response_body, size_t response_length) {
  zerei_pending_request* pending = (zerei_pending_request*)request_handle;
  rc_api_server_response_t response = { 0 };
  if (!pending) return;
  response.body = response_body;
  response.body_length = response_length;
  response.http_status_code = http_status > 0 ? http_status : RC_API_SERVER_RESPONSE_RETRYABLE_CLIENT_ERROR;
  pending->callback(&response, pending->callback_userdata);
  free(pending);
}