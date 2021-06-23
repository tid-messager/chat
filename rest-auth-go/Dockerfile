FROM alpine:3.9 as builder
RUN apk --no-cache add tzdata zip ca-certificates
WORKDIR /usr/share/zoneinfo
# -0 means no compression.  Needed because go's
# tz loader doesn't handle compressed data.
RUN zip -q -r -0 /zoneinfo.zip .

FROM scratch
# the timezone data:
COPY --from=builder /zoneinfo.zip /
# the tls certificates:
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY auth auth
COPY dummy_data.json dummy_data.json
ENV TIMEZONE=Europe/Moscow
ENV ZONEINFO=/zoneinfo.zip
EXPOSE 8080
CMD ["./auth"]