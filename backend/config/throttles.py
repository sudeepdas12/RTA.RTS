from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class AnonymousRateThrottle(AnonRateThrottle):
    scope = 'anon'


class BurstRateThrottle(SimpleRateThrottle):
    scope = 'burst'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = str(request.user.pk)
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }


class UserRateThrottle(UserRateThrottle):
    scope = 'user'