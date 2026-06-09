# Generated for SIS ENSET v5
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=180)),
                ('message', models.TextField()),
                ('type', models.CharField(choices=[('INFO', 'Information'), ('MESSAGE', 'Message interne'), ('VALIDATION', 'Validation'), ('REJET', 'Rejet'), ('SYSTEME', 'Système')], default='INFO', max_length=20)),
                ('lien', models.CharField(blank=True, max_length=220)),
                ('lu', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
